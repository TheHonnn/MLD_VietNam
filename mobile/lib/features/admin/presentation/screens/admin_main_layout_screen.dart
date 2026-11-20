import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../auth/presentation/screens/a03_login_screen.dart';
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
  String? _pendingQrCode;
  int _qrScanNonce = 0;

  bool get _isFullAdmin => AuthService.instance.isAdmin;

  @override
  void initState() {
    super.initState();
    final maxIndex = _isFullAdmin ? 3 : 2;
    _currentIndex = widget.initialTab.clamp(0, maxIndex);
  }

  void _onNavigateTab(int index, {String? subTab}) {
    int targetIndex = index;
    if (!_isFullAdmin) {
      if (index == 3) {
        targetIndex = 2;
      } else if (index == 2) {
        targetIndex = 1;
      }
    }
    final maxIndex = _isFullAdmin ? 3 : 2;
    setState(() {
      _currentIndex = targetIndex.clamp(0, maxIndex);
      _subTab = subTab;
    });
  }

  void _openQrScanner() {
    showDialog(
      context: context,
      builder: (_) => AdminQrScannerModal(
        onCodeScanned: (code) {
          setState(() {
            _currentIndex = 1;
            _pendingQrCode = code;
            _qrScanNonce++;
          });
        },
      ),
    );
  }

  Future<void> _handleLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            const Icon(Icons.logout_rounded, color: Color(0xFFE11D48), size: 24),
            const SizedBox(width: 8),
            Text(
              'Đăng xuất',
              style: AppTypography.zaloFont(fontSize: 16, fontWeight: FontWeight.w700),
            ),
          ],
        ),
        content: Text(
          _isFullAdmin
              ? 'Bạn có chắc chắn muốn đăng xuất khỏi giao diện quản trị viên?'
              : 'Bạn có chắc chắn muốn đăng xuất khỏi giao diện nhân viên?',
          style: AppTypography.zaloFont(fontSize: 13, color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(
              'Hủy',
              style: AppTypography.zaloFont(
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFE11D48),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: Text(
              'Đăng xuất',
              style: AppTypography.zaloFont(
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      await AuthService.instance.logout();
      if (mounted) {
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => const A03LoginScreen()),
          (route) => false,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> screens = _isFullAdmin
        ? [
            AdminDashboardScreen(
              onNavigateTab: _onNavigateTab,
              onOpenQrScanner: _openQrScanner,
              onLogout: _handleLogout,
            ),
            AdminFrontdeskScreen(
              key: ValueKey('frontdesk_$_subTab'),
              initialStatus: _subTab,
              pendingQrCode: _pendingQrCode,
              qrScanNonce: _qrScanNonce,
            ),
            AdminAcademyScreen(
              key: ValueKey('academy_$_subTab'),
              initialWorkflowTab: _subTab,
            ),
            AdminCatalogScreen(
              key: ValueKey('catalog_$_subTab'),
              initialTab: _subTab,
            ),
          ]
        : [
            AdminDashboardScreen(
              onNavigateTab: _onNavigateTab,
              onOpenQrScanner: _openQrScanner,
              onLogout: _handleLogout,
            ),
            AdminFrontdeskScreen(
              key: ValueKey('frontdesk_$_subTab'),
              initialStatus: _subTab,
              pendingQrCode: _pendingQrCode,
              qrScanNonce: _qrScanNonce,
            ),
            AdminCatalogScreen(
              key: ValueKey('catalog_$_subTab'),
              initialTab: _subTab,
            ),
          ];

    final int safeIndex = _currentIndex.clamp(0, screens.length - 1);

    return Scaffold(
      body: IndexedStack(
        index: safeIndex,
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
              children: _isFullAdmin
                  ? [
                      _buildNavItem(0, 'Tổng quan', Icons.grid_view_rounded),
                      _buildNavItem(1, 'Tiếp đón', Icons.calendar_month_rounded),
                      _buildNavItem(2, 'Tuyển sinh', Icons.view_kanban_rounded),
                      _buildNavItem(3, 'Danh mục & SP', Icons.storefront_rounded),
                      _buildLogoutItem(),
                    ]
                  : [
                      _buildNavItem(0, 'Tổng quan', Icons.grid_view_rounded),
                      _buildNavItem(1, 'Tiếp đón', Icons.calendar_month_rounded),
                      _buildNavItem(2, 'Danh mục & SP', Icons.storefront_rounded),
                      _buildLogoutItem(),
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
                style: AppTypography.zaloFont(
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

  Widget _buildLogoutItem() {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: _handleLogout,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
          margin: const EdgeInsets.only(right: 6),
          decoration: BoxDecoration(
            color: const Color(0xFFE11D48),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.logout_rounded,
                size: 15,
                color: Colors.white,
              ),
              const SizedBox(width: 4),
              Text(
                'Đăng xuất',
                style: AppTypography.zaloFont(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

