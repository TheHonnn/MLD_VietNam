import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import 'package:medical_healthcare_app/features/home/data/models/home_models.dart';
import 'package:medical_healthcare_app/features/home/data/repositories/mock_home_repository.dart';
import '../widgets/branch_card_widget.dart';
import '../widgets/specialist_card_widget.dart';
import '../../../booking/presentation/screens/c01_service_selection_screen.dart';
import '../../../booking/data/models/booking_models.dart';

class B02BranchesSpecialistsScreen extends StatefulWidget {
  final int initialTabIndex;

  const B02BranchesSpecialistsScreen({
    super.key,
    this.initialTabIndex = 0,
  });

  @override
  State<B02BranchesSpecialistsScreen> createState() => _B02BranchesSpecialistsScreenState();
}

class _B02BranchesSpecialistsScreenState extends State<B02BranchesSpecialistsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();

  List<ClinicModel> _allClinics = [];
  List<ClinicModel> _filteredClinics = [];

  List<DoctorModel> _allDoctors = [];
  List<DoctorModel> _filteredDoctors = [];

  String _selectedClinicCity = 'Tất cả';
  String _selectedDoctorSpeciality = 'Tất cả';

  final List<String> _clinicFilters = ['Tất cả', 'TP. Hồ Chí Minh', 'Hà Nội'];
  final List<String> _doctorFilters = ['Tất cả', 'Tim Mạch', 'Nhi Khoa', 'Da Liễu'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: 2,
      vsync: this,
      initialIndex: widget.initialTabIndex,
    );
    _loadData();
    _searchController.addListener(_filterData);
  }

  void _loadData() {
    _allClinics = MockHomeRepository.getClinics();
    _allDoctors = MockHomeRepository.getTopDoctors();
    _filteredClinics = List.from(_allClinics);
    _filteredDoctors = List.from(_allDoctors);
  }

  void _filterData() {
    final query = _searchController.text.toLowerCase().trim();

    setState(() {
      // Filter Clinics
      _filteredClinics = _allClinics.where((clinic) {
        final matchesQuery = query.isEmpty ||
            clinic.name.toLowerCase().contains(query) ||
            clinic.address.toLowerCase().contains(query);
        final matchesCity = _selectedClinicCity == 'Tất cả' ||
            clinic.city.contains(_selectedClinicCity);
        return matchesQuery && matchesCity;
      }).toList();

      // Filter Doctors
      _filteredDoctors = _allDoctors.where((doc) {
        final matchesQuery = query.isEmpty ||
            doc.name.toLowerCase().contains(query) ||
            doc.speciality.toLowerCase().contains(query) ||
            doc.clinicName.toLowerCase().contains(query);
        final matchesSpec = _selectedDoctorSpeciality == 'Tất cả' ||
            doc.speciality.toLowerCase().contains(_selectedDoctorSpeciality.toLowerCase());
        return matchesQuery && matchesSpec;
      }).toList();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Cơ sở & Đội ngũ chuyên gia'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border),
            ),
            child: TabBar(
              controller: _tabController,
              indicator: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(12),
              ),
              indicatorSize: TabBarIndicatorSize.tab,
              labelColor: Colors.white,
              unselectedLabelColor: AppColors.textSecondary,
              labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
              unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
              tabs: const [
                Tab(text: 'Cơ sở & Chi nhánh'),
                Tab(text: 'Đội ngũ chuyên gia'),
              ],
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          const SizedBox(height: 12),
          // Search Field
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20.0),
            child: Container(
              height: 48,
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border),
              ),
              child: TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  contentPadding: const EdgeInsets.symmetric(vertical: 12),
                  hintText: 'Tìm kiếm theo tên, địa chỉ, chuyên môn...',
                  hintStyle: const TextStyle(fontSize: 13, color: AppColors.textPlaceholder),
                  prefixIcon: const Icon(Icons.search_rounded, color: AppColors.textSecondary, size: 20),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear_rounded, size: 18),
                          onPressed: () {
                            _searchController.clear();
                          },
                        )
                      : null,
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  filled: false,
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),
          // Filter Chips Carousel
          AnimatedBuilder(
            animation: _tabController,
            builder: (context, _) {
              final isClinicTab = _tabController.index == 0;
              final filters = isClinicTab ? _clinicFilters : _doctorFilters;
              final selected = isClinicTab ? _selectedClinicCity : _selectedDoctorSpeciality;

              return SizedBox(
                height: 38,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: filters.length,
                  itemBuilder: (context, index) {
                    final item = filters[index];
                    final isSelected = item == selected;
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4.0),
                      child: FilterChip(
                        selected: isSelected,
                        label: Text(item),
                        labelStyle: TextStyle(
                          fontSize: 12,
                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                          color: isSelected ? Colors.white : AppColors.textPrimary,
                        ),
                        backgroundColor: AppColors.surface,
                        selectedColor: AppColors.primary,
                        checkmarkColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20),
                          side: BorderSide(
                            color: isSelected ? AppColors.primary : AppColors.border,
                          ),
                        ),
                        onSelected: (val) {
                          setState(() {
                            if (isClinicTab) {
                              _selectedClinicCity = item;
                            } else {
                              _selectedDoctorSpeciality = item;
                            }
                            _filterData();
                          });
                        },
                      ),
                    );
                  },
                ),
              );
            },
          ),
          const SizedBox(height: 10),
          // Tab View Content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                // TAB 1: Danh sách cơ sở
                _filteredClinics.isEmpty
                    ? _buildEmptyState('Không tìm thấy cơ sở phù hợp.')
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                        itemCount: _filteredClinics.length,
                        itemBuilder: (context, index) {
                          final clinic = _filteredClinics[index];
                          return BranchCardWidget(
                            clinic: clinic,
                            onBookTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => C01ServiceSelectionScreen(
                                    flowState: BookingFlowState(selectedBranch: clinic),
                                  ),
                                ),
                              );
                            },
                            onDirectionTap: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Chỉ đường đến: ${clinic.address}'),
                                  backgroundColor: AppColors.primary,
                                ),
                              );
                            },
                          );
                        },
                      ),
                // TAB 2: Danh sách bác sĩ / chuyên gia
                _filteredDoctors.isEmpty
                    ? _buildEmptyState('Không tìm thấy chuyên gia phù hợp.')
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                        itemCount: _filteredDoctors.length,
                        itemBuilder: (context, index) {
                          final doctor = _filteredDoctors[index];
                          return SpecialistCardWidget(
                            doctor: doctor,
                            onBookTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => C01ServiceSelectionScreen(
                                    flowState: BookingFlowState(selectedSpecialist: doctor),
                                  ),
                                ),
                              );
                            },
                            onProfileTap: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Xem hồ sơ chi tiết: ${doctor.name}'),
                                  backgroundColor: AppColors.primary,
                                ),
                              );
                            },
                          );
                        },
                      ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.search_off_rounded,
            size: 56,
            color: AppColors.textPlaceholder.withValues(alpha: 0.6),
          ),
          const SizedBox(height: 12),
          Text(
            message,
            style: const TextStyle(
              fontSize: 14,
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
