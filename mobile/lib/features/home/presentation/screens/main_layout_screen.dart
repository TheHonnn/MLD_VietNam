import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/motion/app_page_transitions.dart';
import '../../../../core/services/auth_service.dart';
import '../../../booking/presentation/screens/all_in_one_booking_screen.dart';
import '../../../services/presentation/screens/b02_service_listing_screen.dart';
import '../../../academy/presentation/screens/e01_academy_home_screen.dart';
import '../../../membership/presentation/screens/f01_profile_dashboard_screen.dart';
import '../../../treatment/presentation/screens/d09_documents_screen.dart';
import '../../../directory/presentation/screens/b05_branch_listing_screen.dart';
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
  final Set<int> _loadedTabs = {};
  final GlobalKey<E01AcademyHomeScreenState> _academyKey = GlobalKey<E01AcademyHomeScreenState>();

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _loadedTabs.add(_currentIndex);
    AuthService.instance.isLoggedInNotifier.addListener(_onAuthChanged);
  }

  void _onAuthChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    AuthService.instance.isLoggedInNotifier.removeListener(_onAuthChanged);
    super.dispose();
  }

  void _onTabTapped(int index) {
    setState(() {
      _currentIndex = index;
      _loadedTabs.add(index);
    });
  }



  @override
  Widget build(BuildContext context) {
    final List<Widget> screens = [
      // Tab 0: Trang chủ (B01_Home)
      B01HomeScreen(
        onNavigateToServices: () => _onTabTapped(1),
        onNavigateToBooking: () {
          Navigator.push(
            context,
            AppPageTransitions.modalSlideUp(
              page: AllInOneBookingScreen(
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
      // Tab 2: Đào tạo (Group E)
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
      // Tab 5: Cơ sở (B05 Branch Listing)
      B05BranchListingScreen(
        onBack: () => _onTabTapped(0),
      ),
    ];

    final int safeIndex = (_currentIndex >= 0 && _currentIndex < screens.length) ? _currentIndex : 0;

    return PopScope(
      canPop: safeIndex == 0,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop && safeIndex != 0) {
          _onTabTapped(0);
        }
      },
      child: Scaffold(
        body: IndexedStack(
          index: safeIndex,
          children: List.generate(screens.length, (index) {
            if (_loadedTabs.contains(index)) {
              return screens[index];
            } else {
              return const SizedBox.shrink();
            }
          }),
        ),
        // Bottom Navigation Bar chuẩn Y khoa cao cấp 5 Tabs:
      // Trang chủ (0) · Dịch vụ (1) · Đào tạo (2) · Kiến thức (3) · Cá nhân (4)
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          // BỎ VIỀN TOP, NỔI BẬT KHỐI BẰNG BÓNG MỜ MỎNG
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, -3),
            ),
          ],
        ),
        child: SafeArea(
          top: false,
          child: Container(
            height: 64,
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
            child: Row(
              children: [
                // 1. Tab Trang chủ
                _buildNavItem(
                  index: 0,
                  safeIndex: safeIndex,
                  label: 'Trang chủ',
                  activeIcon: Icons.home_rounded,
                  inactiveIcon: Icons.home_outlined,
                ),
                // 2. Tab Dịch vụ
                _buildNavItem(
                  index: 1,
                  safeIndex: safeIndex,
                  label: 'Dịch vụ',
                  activeIcon: Icons.medical_services_rounded,
                  inactiveIcon: Icons.medical_services_outlined,
                ),
                // 3. Tab Đào tạo
                _buildNavItem(
                  index: 2,
                  safeIndex: safeIndex,
                  label: 'Đào tạo',
                  activeIcon: Icons.school_rounded,
                  inactiveIcon: Icons.school_outlined,
                ),
                // 4. Tab Kiến thức (Đổi từ Tài liệu)
                _buildNavItem(
                  index: 3,
                  safeIndex: safeIndex,
                  label: 'Kiến thức',
                  activeIcon: Icons.menu_book_rounded,
                  inactiveIcon: Icons.menu_book_outlined,
                ),
                // 5. Tab Cá nhân
                _buildNavItem(
                  index: 4,
                  safeIndex: safeIndex,
                  label: 'Cá nhân',
                  activeIcon: Icons.person_rounded,
                  inactiveIcon: Icons.person_outline_rounded,
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

  Widget _buildNavItem({
    required int index,
    required int safeIndex,
    required String label,
    required IconData activeIcon,
    required IconData inactiveIcon,
  }) {
    final bool isSelected = safeIndex == index;
    const Color activeColor = AppColors.primary;
    const Color inactiveColor = Color(0xFF64748B);

    return Expanded(
      child: InkWell(
        onTap: () => _onTabTapped(index),
        borderRadius: BorderRadius.circular(12),
        splashColor: AppColors.primary.withValues(alpha: 0.08),
        highlightColor: Colors.transparent,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.iceBlue.withValues(alpha: 0.7) : Colors.transparent,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                isSelected ? activeIcon : inactiveIcon,
                size: 23,
                color: isSelected ? activeColor : inactiveColor,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.beVietnamPro(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected ? activeColor : inactiveColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
