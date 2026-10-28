import 'package:flutter/material.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
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
    ];

    return Scaffold(
      body: screens[_currentIndex],
      // Bottom Navigation Bar chuẩn Design System (#FFFFFF, #E5E7EB, #2860EB)
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border: const Border(
            top: BorderSide(
              color: AppColors.border,
              width: 1.0,
            ),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: 68,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildNavItem(0, context.tr('Trang chủ', 'Home'), Icons.home_rounded),
                _buildNavItem(1, context.tr('Dịch vụ', 'Services'), Icons.medical_services_outlined),
                _buildNavItem(2, context.tr('Đào tạo', 'Academy'), Icons.school_outlined),
                _buildNavItem(3, context.tr('Tài liệu', 'Documents'), Icons.menu_book_rounded),
                _buildNavItem(4, context.tr('Cá nhân', 'Profile'), Icons.person_outline_rounded),
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
                color: isSelected ? const Color(0xFFEFF4FE) : Colors.transparent,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                icon,
                size: 22,
                color: isSelected ? const Color(0xFF2860EB) : const Color(0xFF616161),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected ? const Color(0xFF2860EB) : const Color(0xFF616161),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
