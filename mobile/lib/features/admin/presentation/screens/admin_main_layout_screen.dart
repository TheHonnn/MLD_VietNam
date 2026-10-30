import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../home/presentation/screens/main_layout_screen.dart';
import 'admin_dashboard_screen.dart';
import 'admin_frontdesk_screen.dart';
import 'admin_academy_screen.dart';
import 'admin_catalog_screen.dart';
import '../widgets/admin_qr_scanner_modal.dart';

class AdminMainLayoutScreen extends StatefulWidget {
  final int initialTab;

  const AdminMainLayoutScreen({
    super.key,
    this.initialTab = 0,
  });

  @override
  State<AdminMainLayoutScreen> createState() => _AdminMainLayoutScreenState();
}

class _AdminMainLayoutScreenState extends State<AdminMainLayoutScreen> {
  late int _currentIndex;
  String? _subTab;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialTab;
  }

  void _onNavigateTab(int index, {String? subTab}) {
    setState(() {
      _currentIndex = index;
      _subTab = subTab;
    });
  }

  void _openQrScanner() {
    showDialog(
      context: context,
      builder: (_) => AdminQrScannerModal(
        onCodeScanned: (code) {
          // Chuyển sang Tab 1 (Tiếp đón) để xử lý mã đã quét
          setState(() {
            _currentIndex = 1;
          });
        },
      ),
    );
  }

  void _switchToCustomerMode() {
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => const MainLayoutScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> screens = [
      AdminDashboardScreen(
        onNavigateTab: _onNavigateTab,
        onOpenQrScanner: _openQrScanner,
      ),
      const AdminFrontdeskScreen(),
      AdminAcademyScreen(
        key: ValueKey('academy_$_subTab'),
        initialWorkflowTab: _subTab,
      ),
      AdminCatalogScreen(
        key: ValueKey('catalog_$_subTab'),
        initialTab: _subTab,
      ),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          border: const Border(
            top: BorderSide(color: Color(0xFFE5E7EB), width: 1),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 10,
              offset: const Offset(0, -3),
            ),
          ],
        ),
        child: SafeArea(
          child: SizedBox(
            height: 64,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildNavItem(0, 'Tổng quan', Icons.grid_view_rounded),
                _buildNavItem(1, 'Tiếp đón Spa', Icons.calendar_month_rounded),
                _buildNavItem(2, 'Đào tạo', Icons.school_rounded),
                _buildNavItem(3, 'Dịch vụ & Khóa', Icons.spa_rounded),
                _buildSwitchModeItem(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, String label, IconData icon) {
    final isSelected = _currentIndex == index;

    return Expanded(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            setState(() {
              _currentIndex = index;
              _subTab = null;
            });
          },
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.primaryLight : Colors.transparent,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  icon,
                  size: 20,
                  color: isSelected ? AppColors.primary : const Color(0xFF6B7280),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.montserrat(
                  fontSize: 10,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  color: isSelected ? AppColors.primary : const Color(0xFF6B7280),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSwitchModeItem() {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          showDialog(
            context: context,
            builder: (ctx) => AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: Text(
                'Chuyển sang Chế độ Khách hàng',
                style: GoogleFonts.montserrat(fontSize: 16, fontWeight: FontWeight.w700),
              ),
              content: Text(
                'Bạn có muốn chuyển sang xem giao diện ứng dụng từ góc nhìn của Khách hàng không?',
                style: GoogleFonts.montserrat(fontSize: 13, color: AppColors.textSecondary),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: Text('Ở lại', style: GoogleFonts.montserrat(fontWeight: FontWeight.w600)),
                ),
                ElevatedButton(
                  onPressed: () {
                    Navigator.pop(ctx);
                    _switchToCustomerMode();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: Text('Chuyển đổi', style: GoogleFonts.montserrat(fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          );
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF1F2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.switch_account_rounded,
                  size: 18,
                  color: Color(0xFFE11D48),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                'App Khách',
                style: GoogleFonts.montserrat(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFFE11D48),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

