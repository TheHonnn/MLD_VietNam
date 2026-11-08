import 'dart:async';
import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/motion/app_page_transitions.dart';
import '../../../../core/services/auth_service.dart';
import '../../../admin/presentation/screens/admin_main_layout_screen.dart';
import '../../../home/presentation/screens/main_layout_screen.dart';
import 'a02_welcome_screen.dart';

/// ============================================================================
/// MÀN HÌNH KHỞI ĐỘNG CHUẨN MLD MOTION SYSTEM (A01 SPLASH SCREEN)
/// ============================================================================
/// 1. Tách biệt hoàn toàn Hoạt cảnh Logo và Quá trình nạp Session.
/// 2. Đúng 3 thành phần: Nền #F8FAFC, Logo Fade In, Pure Cross-fade sang Home.
/// 3. Scale cố định 1.0 (Không phóng to hay thu nhỏ, không Shimmer, không Spinner).
/// 4. Tap to skip: Bỏ qua hoạt cảnh logo ngay lập tức, không ngắt auth.
/// 5. Hard Timeout 1.5s: Vào Guest Mode nếu mạng lag, phản hồi muộn cập nhật tĩnh lặng.
/// ============================================================================
class A01SplashScreen extends StatefulWidget {
  const A01SplashScreen({super.key});

  @override
  State<A01SplashScreen> createState() => _A01SplashScreenState();
}

class _A01SplashScreenState extends State<A01SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _logoController;
  late final Animation<double> _logoFadeAnimation;

  Timer? _timeoutTimer;
  bool _hasNavigated = false;
  bool? _sessionResult;

  @override
  void initState() {
    super.initState();

    // 1. Trục Hoạt cảnh Logo: Fade In êm dịu (Tối đa 800 - 1000ms, Scale 1.0)
    _logoController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );

    _logoFadeAnimation = CurvedAnimation(
      parent: _logoController,
      curve: Curves.easeIn,
    );

    _logoController.forward();

    // 2. Trục Dữ liệu & Phiên làm việc chạy song song độc lập
    _checkSessionPipeline();

    // 3. Hard Timeout an toàn kỹ thuật 1.5 giây
    _timeoutTimer = Timer(MldMotionDuration.splashHardTimeout, () {
      if (!_hasNavigated && mounted) {
        // Quá hạn 1.5s -> Cưỡng chế vào Trang chủ / Welcome ở Chế độ Khách (Guest Mode)
        _navigateToDestination(isAutoLogin: _sessionResult ?? false, isGuestFallback: true);
      }
    });
  }

  Future<void> _checkSessionPipeline() async {
    try {
      final canAutoLogin = await AuthService.instance.checkAutoLogin();
      _sessionResult = canAutoLogin;
    } catch (_) {
      _sessionResult = false;
    }

    // Session đã sẵn sàng -> Vào Trang chủ ngay, không bắt buộc đợi đủ 800ms
    if (mounted && !_hasNavigated) {
      _navigateToDestination(isAutoLogin: _sessionResult ?? false);
    }
  }

  /// Quy chuẩn Tap to skip:
  /// - CHỈ bỏ qua hoạt cảnh hình ảnh Logo.
  /// - TUYỆT ĐỐI KHÔNG bỏ qua xác thực phiên hoặc nạp dữ liệu.
  void _handleTapToSkip() {
    _logoController.stop();

    if (_sessionResult != null) {
      // Dữ liệu đã sẵn sàng -> Chuyển ngay
      _navigateToDestination(isAutoLogin: _sessionResult!);
    }
    // Nếu session chưa sẵn sàng, tiếp tục chờ đến Hard Timeout 1.5s
  }

  void _navigateToDestination({required bool isAutoLogin, bool isGuestFallback = false}) {
    if (_hasNavigated || !mounted) return;
    _hasNavigated = true;
    _timeoutTimer?.cancel();

    final Widget destination = isAutoLogin
        ? (AuthService.instance.isAdmin
            ? const AdminMainLayoutScreen()
            : const MainLayoutScreen())
        : const A02WelcomeScreen();

    // Pure Cross-fade đúng 300ms, Scale cố định 1.0
    Navigator.pushReplacement(
      context,
      AppPageTransitions.pureCrossFade(page: destination),
    );
  }

  @override
  void dispose() {
    _timeoutTimer?.cancel();
    _logoController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _handleTapToSkip,
      behavior: HitTestBehavior.opaque,
      child: Scaffold(
        backgroundColor: const Color(0xFFF8FAFC), // Nền sáng tinh khiết chuẩn MLD
        body: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: FadeTransition(
              opacity: _logoFadeAnimation,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Logo Card chuẩn Modern Medical (Scale 1.0 cố định)
                  Container(
                    width: 204,
                    height: 94,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: AppColors.border,
                        width: 1.2,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withValues(alpha: 0.08),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Image.asset(
                      'assets/images/logo.webp',
                      fit: BoxFit.contain,
                      errorBuilder: (_, __, ___) => Image.asset(
                        'assets/images/logo.webp',
                        fit: BoxFit.contain,
                      ),
                    ),
                  ),

                  const SizedBox(height: 36),

                  // Header Title 1: Chăm sóc sức khỏe
                  const Text(
                    'CHĂM SÓC SỨC KHỎE',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.5,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Header Title 2: & Đào tạo nghề
                  const Text(
                    '& ĐÀO TẠO NGHỀ',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.2,
                      color: AppColors.primary,
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Divider Primary Teal
                  Container(
                    width: 48,
                    height: 2.5,
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Lời hứa thương hiệu
                  const Text(
                    'Tận tâm chăm sóc – Đồng hành phát triển',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
