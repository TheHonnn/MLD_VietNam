import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../booking/presentation/screens/c01_service_selection_screen.dart';
import '../../../booking/presentation/screens/c09_my_appointments_screen.dart';
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

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
  }

  void _onTabTapped(int index) {
    setState(() {
      _currentIndex = index;
    });
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
              builder: (_) => C01ServiceSelectionScreen(
                onBack: () => Navigator.pop(context),
                onOpenAppointments: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const C09MyAppointmentsScreen()),
                  );
                },
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
      // Bottom Navigation Bar chuẩn 100% Figma: 5 mục (Trang chủ, Dịch vụ, Đặt lịch, Học viện, Cá nhân)
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppColors.surface, // white
          border: const Border(
            top: BorderSide(
              color: AppColors.border, // #E3D1BF
              width: 1.0,
            ),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
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
            // Hộp icon active nền #F3E2CE, r=12 chuẩn Figma Node 8109:14563
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.surfaceSecondary : Colors.transparent,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                icon,
                size: 22,
                color: isSelected ? AppColors.primary : AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                color: isSelected ? AppColors.primary : AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

