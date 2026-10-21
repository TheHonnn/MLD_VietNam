import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import 'b08_specialist_profile_screen.dart';

import '../../../home/data/repositories/technician_repository.dart';

class B07SpecialistListingScreen extends StatefulWidget {
  final VoidCallback? onBack;

  const B07SpecialistListingScreen({
    super.key,
    this.onBack,
  });

  @override
  State<B07SpecialistListingScreen> createState() => _B07SpecialistListingScreenState();
}

class _B07SpecialistListingScreenState extends State<B07SpecialistListingScreen> {
  final TextEditingController _searchController = TextEditingController();
  bool _isLoading = false;
  String _selectedBranch = 'Tất cả';
  String _selectedExpertise = 'Tất cả';
  String _selectedService = 'Tất cả';
  String _selectedHour = 'Tất cả';
  String _selectedSort = 'Theo tên chuyên viên';

  List<Map<String, dynamic>> _allSpecialists = [];

  @override
  void initState() {
    super.initState();
    _loadSpecialists();
  }

  Future<void> _loadSpecialists() async {
    setState(() => _isLoading = true);
    final list = await TechnicianRepository.instance.getTechnicians();
    if (mounted) {
      setState(() {
        _allSpecialists = list.map((t) => {
          'id': t.id,
          'name': t.name,
          'role': t.title,
          'tag': '${t.experienceYears} năm kinh nghiệm · ⭐ ${t.rating.toStringAsFixed(1)}',
          'desc': t.specialties.isNotEmpty ? t.specialties.join(' · ') : t.speciality,
          'avatar': t.avatarUrl,
          'heroAvatar': t.avatarUrl,
          'branch': t.clinicName,
          'expertise': t.speciality,
        }).toList();
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> get _filteredSpecialists {
    final query = _searchController.text.toLowerCase().trim();
    return _allSpecialists.where((sp) {
      final matchesQuery = query.isEmpty ||
          (sp['name'] as String).toLowerCase().contains(query) ||
          (sp['role'] as String).toLowerCase().contains(query) ||
          (sp['desc'] as String).toLowerCase().contains(query);

      final matchesBranch = _selectedBranch == 'Tất cả' || sp['branch'] == _selectedBranch;
      final matchesExpertise = _selectedExpertise == 'Tất cả' || sp['expertise'] == _selectedExpertise;

      return matchesQuery && matchesBranch && matchesExpertise;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final specialists = _filteredSpecialists;

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
                          'Đội ngũ chuyên viên',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textHeading, // #693B20
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Đồng hành cùng bạn trong hành trình chăm sóc sức khỏe.',
                          style: TextStyle(
                            fontSize: 12,
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
                          hintText: 'Tìm tên hoặc chuyên môn...',
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

              // --- 3. FILTER DROPDOWNS (2x2 Grid) ---
              Row(
                children: [
                  Expanded(
                    child: _buildFilterDropdown(
                      label: 'Chi nhánh',
                      value: _selectedBranch,
                      items: ['Tất cả', 'Chi nhánh Quận 3', 'Chi nhánh Cầu Giấy'],
                      onChanged: (v) => setState(() => _selectedBranch = v!),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildFilterDropdown(
                      label: 'Chuyên môn',
                      value: _selectedExpertise,
                      items: ['Tất cả', 'Chăm sóc da', 'Massage thư giãn', 'Chăm sóc cơ thể'],
                      onChanged: (v) => setState(() => _selectedExpertise = v!),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _buildFilterDropdown(
                      label: 'Dịch vụ',
                      value: _selectedService,
                      items: ['Tất cả', 'Massage', 'Chăm sóc da'],
                      onChanged: (v) => setState(() => _selectedService = v!),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildFilterDropdown(
                      label: 'Giờ làm việc',
                      value: _selectedHour,
                      items: ['Tất cả', 'Buổi sáng (09:00–12:00)', 'Buổi chiều (13:00–18:00)'],
                      onChanged: (v) => setState(() => _selectedHour = v!),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // Sắp xếp
              _buildFilterDropdown(
                label: 'Sắp xếp',
                value: _selectedSort,
                items: ['Theo tên chuyên viên', 'Được yêu thích nhất', 'Nhiều kinh nghiệm nhất'],
                onChanged: (v) => setState(() => _selectedSort = v!),
              ),

              const SizedBox(height: 16),

              // --- 4. NOTICE BANNER ---
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.surfaceSecondary, // #F3E2CE
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  'Đội ngũ chuyên viên giàu kinh nghiệm tại chi nhánh',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // --- 5. SPECIALISTS LIST ---
              if (_isLoading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 40),
                  child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
                )
              else if (specialists.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 32),
                  child: Center(
                    child: Text('Không tìm thấy chuyên viên nào phù hợp.', style: TextStyle(color: AppColors.textSecondary)),
                  ),
                )
              else
                ...specialists.map((sp) {
                  final avatar = sp['avatar'] as String? ?? '';
                  return Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.03),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: avatar.startsWith('http')
                              ? Image.network(
                                  avatar,
                                  width: 80,
                                  height: 94,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => Container(
                                    width: 80,
                                    height: 94,
                                    color: AppColors.surfaceSecondary,
                                    child: const Icon(Icons.person, size: 40, color: AppColors.primary),
                                  ),
                                )
                              : Image.asset(
                                  avatar,
                                  width: 80,
                                  height: 94,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => Container(
                                    width: 80,
                                    height: 94,
                                    color: AppColors.surfaceSecondary,
                                    child: const Icon(Icons.person, size: 40, color: AppColors.primary),
                                  ),
                                ),
                        ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              sp['name'] as String,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textHeading,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              sp['role'] as String,
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppColors.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              sp['tag'] as String,
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              sp['desc'] as String,
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 10),
                            InkWell(
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => B08SpecialistProfileScreen(
                                      name: sp['name'] as String,
                                      role: sp['role'] as String,
                                      avatar: (sp['heroAvatar'] as String?) ?? (sp['avatar'] as String),
                                    ),
                                  ),
                                );
                              },
                              child: const Text(
                                'Xem hồ sơ →',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.primary,
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

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFilterDropdown({
    required String label,
    required String value,
    required List<String> items,
    required ValueChanged<String?> onChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 4),
        Container(
          height: 44,
          padding: const EdgeInsets.symmetric(horizontal: 10),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.border),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: value,
              isExpanded: true,
              icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 18, color: AppColors.textSecondary),
              items: items.map((it) {
                return DropdownMenuItem<String>(
                  value: it,
                  child: Text(
                    it,
                    style: const TextStyle(fontSize: 12, color: AppColors.textPrimary),
                    overflow: TextOverflow.ellipsis,
                  ),
                );
              }).toList(),
              onChanged: onChanged,
            ),
          ),
        ),
      ],
    );
  }
}

