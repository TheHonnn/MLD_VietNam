import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../booking/presentation/screens/all_in_one_booking_screen.dart';
import '../../../services/presentation/screens/b02_service_listing_screen.dart';
import '../../../academy/presentation/screens/e01_academy_home_screen.dart';
import '../../../membership/presentation/screens/f01_profile_dashboard_screen.dart';
import '../../../treatment/presentation/screens/d09_documents_screen.dart';
import 'b01_home_screen.dart';

class MainLayoutScreen extends StatefulWidget {
  final int initialIndex;

  const MainLayoutScreen({
    super.key,
    this.initialIndex = 0,
  });

  @override
  State<MainLayoutScreen> createState() => _MainLayoutScreenState();
}

class _MainLayoutScreenState extends State<MainLayoutScreen> {
  late int _currentIndex;
  final GlobalKey<E01AcademyHomeScreenState> _academyKey = GlobalKey<E01AcademyHomeScreenState>();

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
  }

  void _onTabTapped(int index) {
    if (index == 2) {
      // 1. Chuyển sang Tab 2 (Trang Đào tạo)
      setState(() {
        _currentIndex = 2;
      });
      // 2. Mở Dropdown lựa chọn nhanh (Người đang làm nghề / Người mới bắt đầu)
      _showAcademyGroupDropdown();
    } else {
      setState(() {
        _currentIndex = index;
      });
    }
  }

  /// Dropdown lựa chọn nhanh khi click vào icon/mục Đào tạo
  Future<void> _showAcademyGroupDropdown() async {
    final selectedGroup = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withOpacity(0.35),
      isScrollControlled: true,
      builder: (ctx) => Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 80),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.12),
              blurRadius: 24,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.school, size: 20, color: AppColors.primary),
                    SizedBox(width: 8),
                    Text(
                      'Khóa học đào tạo MLD',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textHeading,
                      ),
                    ),
                  ],
                ),
                InkWell(
                  onTap: () => Navigator.pop(ctx, null),
                  borderRadius: BorderRadius.circular(20),
                  child: const Padding(
                    padding: EdgeInsets.all(4),
                    child: Icon(Icons.close, size: 20, color: AppColors.textSecondary),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            const Text(
              'Chọn đối tượng để xem chương trình đào tạo phù hợp nhất với bạn:',
              style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 16),

            // Lựa chọn 1: Người đang làm nghề
            InkWell(
              onTap: () => Navigator.pop(ctx, 'Người đang làm nghề'),
              borderRadius: BorderRadius.circular(14),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.border),
                ),
                child: const Row(
                  children: [
                    Container(
                      padding: EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.mintBackground,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.medical_services_outlined, size: 22, color: AppColors.primary),
                    ),
                    SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Người đang làm nghề',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textHeading),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'KTV, Bác sĩ, Spa muốn nâng cao tay nghề hoặc tích hợp dịch vụ MLD',
                            style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    ),
                    Icon(Icons.chevron_right, size: 20, color: AppColors.primary),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),

            // Lựa chọn 2: Người mới bắt đầu
            InkWell(
              onTap: () => Navigator.pop(ctx, 'Người mới bắt đầu'),
              borderRadius: BorderRadius.circular(14),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.border),
                ),
                child: const Row(
                  children: [
                    Container(
                      padding: EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.mintBackground,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.eco_outlined, size: 22, color: AppColors.primary),
                    ),
                    SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Người mới bắt đầu',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textHeading),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Khóa học cơ bản Level 0 và các workshop tự chăm sóc sức khỏe',
                            style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    ),
                    Icon(Icons.chevron_right, size: 20, color: AppColors.primary),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );

    if (selectedGroup != null) {
      _academyKey.currentState?.filterByGroup(selectedGroup);
    } else {
      // Bấm ra vùng trống ngoài menu -> menu ẩn đi và trang vẫn giữ nguyên hiển thị tất cả các khóa học
      _academyKey.currentState?.filterByGroup('Tất cả');
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    final List<Widget> screens = [
      // Tab 0: Trang chủ (B01_Home)
      B01HomeScreen(
        onNavigateToServices: () => _onTabTapped(1),
        onNavigateToBooking: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => AllInOneBookingScreen(
                onBack: () => Navigator.pop(context),
              ),
            ),
          );
        },
        onNavigateToAcademy: () => _onTabTapped(2),
        onNavigateToProfile: () => _onTabTapped(4),
      ),
      // Tab 1: Dịch vụ (B02 Service Listing)
      B02ServiceListingScreen(
        onBack: () => _onTabTapped(0),
      ),
      // Tab 2: Đào tạo (Group E - Chuẩn MLD Academy)
      E01AcademyHomeScreen(
        key: _academyKey,
        onBackToHome: () => _onTabTapped(0),
      ),
      // Tab 3: Tài liệu & Y khoa (D09 Documents Screen)
      D09DocumentsScreen(
        onBackToHome: () => _onTabTapped(0),
      ),
      // Tab 4: Cá nhân (Group F — Membership & Profile chuẩn 100% Figma)
      F01ProfileDashboardScreen(
        onBackToHome: () => _onTabTapped(0),
      ),
    ];

    return Scaffold(
      body: screens[_currentIndex],
      // Bottom Navigation Bar chuẩn Brand Color
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppColors.menuBackground, // rgb(0, 42, 107) #002A6B
          border: const Border(
            top: BorderSide(
              color: Color(0xFF001B45),
              width: 1.0,
            ),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.15),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: 64,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildNavItem(0, l10n?.navHome ?? 'Trang chủ', Icons.home_rounded),
                _buildNavItem(1, l10n?.navServices ?? 'Dịch vụ', Icons.medical_services_outlined),
                _buildNavItem(2, 'Đào tạo', Icons.school_outlined),
                _buildNavItem(3, 'Tài liệu', Icons.menu_book_rounded),
                _buildNavItem(4, l10n?.navProfile ?? 'Cá nhân', Icons.person_outline_rounded),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, String label, IconData icon) {
    final bool isSelected = _currentIndex == index;

    return Expanded(
      child: InkWell(
        onTap: () => _onTabTapped(index),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.secondary.withValues(alpha: 0.22) : Colors.transparent,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                icon,
                size: 22,
                color: isSelected ? AppColors.secondary : Colors.white.withValues(alpha: 0.65),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w400,
                color: isSelected ? AppColors.secondary : Colors.white.withValues(alpha: 0.65),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
