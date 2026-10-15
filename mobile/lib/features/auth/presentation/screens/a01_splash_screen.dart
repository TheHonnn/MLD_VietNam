import 'dart:async';
import 'package:flutter/material.dart';
import '../../../../core/services/auth_service.dart';
import '../../../home/presentation/screens/main_layout_screen.dart';
import 'a02_onboarding_screen.dart';
import 'a03_login_screen.dart';

class A01SplashScreen extends StatefulWidget {
  const A01SplashScreen({super.key});

  @override
  State<A01SplashScreen> createState() => _A01SplashScreenState();
}

class _A01SplashScreenState extends State<A01SplashScreen> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer(const Duration(milliseconds: 2500), () async {
      if (!mounted) return;
      final canAutoLogin = await AuthService.instance.checkAutoLogin();
      if (!mounted) return;

      if (canAutoLogin) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const MainLayoutScreen()),
        );
      } else if (AuthService.instance.hasCompletedOnboarding) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const A03LoginScreen()),
        );
      } else {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const A02OnboardingScreen()),
        );
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFBF8F2), // Màu nền be sáng chuẩn Figma
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Decorative botanical leaf 1 (Top-Right corner matching Figma 8107:5507)
          Positioned(
            top: 20,
            right: 0,
            width: 135,
            child: IgnorePointer(
              child: Image.asset(
                'assets/images/splash_leaf_1.png',
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => const SizedBox.shrink(),
              ),
            ),
          ),

          // Decorative botanical leaf 2 (Bottom-Left corner matching Figma 8107:5508)
          Positioned(
            bottom: 60,
            left: -10,
            width: 145,
            child: IgnorePointer(
              child: Image.asset(
                'assets/images/splash_leaf_2.png',
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => const SizedBox.shrink(),
              ),
            ),
          ),

          // Perfectly Centered Brand Area
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Logo Card bo bởi viền vàng theo đúng thiết kế (Node 8107:6931)
                  Container(
                    width: 204,
                    height: 94,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: const Color(0xFFD4A359), // Viền vàng chuẩn design
                        width: 1.6,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFFD4A359).withValues(alpha: 0.16),
                          blurRadius: 20,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Image.asset(
                      'assets/images/logo_mld.png',
                      fit: BoxFit.contain,
                      errorBuilder: (_, __, ___) => Image.asset(
                        'assets/images/logo.png',
                        fit: BoxFit.contain,
                      ),
                    ),
                  ),

                  const SizedBox(height: 36),

                  // Header Title 1: Chữ đen sẫm chuẩn Figma 8107:5513
                  const Text(
                    'CHĂM SÓC SỨC KHỎE',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.5,
                      color: Color(0xFF26211E),
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Header Title 2: Màu nâu đồng chuẩn Figma 8107:5514
                  const Text(
                    '& ĐÀO TẠO NGHỀ',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.2,
                      color: Color(0xFF8B4513),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Divider vàng chuẩn Figma 8107:5515
                  Container(
                    width: 48,
                    height: 2,
                    decoration: BoxDecoration(
                      color: const Color(0xFFD4A359),
                      borderRadius: BorderRadius.circular(1),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Lời hứa thương hiệu chuẩn Figma 8107:5516
                  const Text(
                    'Tận tâm chăm sóc – Đồng hành phát triển',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w400,
                      color: Color(0xFF7A7067),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Bottom Loading Spinner & status text (Figma 8107:5517)
          const Positioned(
            bottom: 48,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.4,
                      valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF8B4513)),
                    ),
                  ),
                  SizedBox(height: 14),
                  Text(
                    'Đang chuẩn bị trải nghiệm…',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w400,
                      color: Color(0xFF7A7067),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
