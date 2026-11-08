import 'package:flutter/material.dart';

/// ============================================================================
/// HỆ THỐNG HIỆU ỨNG CHUYỂN CẢNH MLD VIỆT NAM (MLD MOTION & NAVIGATION SYSTEM)
/// ============================================================================
/// Căn cứ quy chuẩn kỹ thuật: docs/KE_HOACH_HIEU_UNG_CHUYEN_CANH_MLD.md
///
/// 1. Tôn trọng thời gian người dùng: Nhanh, dứt khoát, không giữ chân vô ích.
/// 2. Tách rời hoàn toàn Hoạt cảnh (Motion) và Luồng nạp dữ liệu (Data Pipeline).
/// 3. Hỗ trợ toàn diện Reduce Motion (Global Override khi disableAnimations = true).
/// 4. Chiều quay lại (Pop/Back) luôn nhanh hơn chiều đi (Push) 20% - 23%.
/// 5. Khóa chống double-tap 150ms chỉ chặn Push trùng lặp, KHÔNG CHẶN BACK.
/// ============================================================================

/// Bộ hằng số Thời lượng chuyển động chuẩn (Motion Duration Tokens)
class MldMotionDuration {
  MldMotionDuration._();

  /// 1. Instant: Chuyển tức thì (0ms)
  static const Duration instant = Duration.zero;

  /// 2. Micro-fade: Chuyển tab hoặc hòa tan nhẹ (<= 80ms)
  static const Duration microFade = Duration(milliseconds: 80);

  /// 3. Tương tác vi mô (Nút bấm, Toggle, Icon): Đi 140ms, Về 100ms (nhanh hơn 28%)
  static const Duration micro = Duration(milliseconds: 140);
  static const Duration microReverse = Duration(milliseconds: 100);

  /// 4. Đào sâu (Drill-down: Chi tiết DV, Khóa học, Cơ sở):
  /// - Push: 240ms
  /// - Pop: 190ms (nhanh hơn khoảng 21%)
  static const Duration drillDownPush = Duration(milliseconds: 240);
  static const Duration drillDownPop = Duration(milliseconds: 190);

  /// 5. Modal / Bottom Sheet (Đặt lịch, Lọc, Form tư vấn, Đăng nhập):
  /// - Push: 260ms
  /// - Pop: 200ms (nhanh hơn khoảng 23%)
  static const Duration modalPush = Duration(milliseconds: 260);
  static const Duration modalPop = Duration(milliseconds: 200);

  /// 6. Splash Ingress -> Trang chủ: Pure Cross-fade 300ms (Scale cố định 1.0)
  static const Duration splashCrossFade = Duration(milliseconds: 300);

  /// Thời gian tối đa của hoạt cảnh Logo nhận diện tại Splash (tối đa 800 - 1000ms)
  static const Duration splashLogoMax = Duration(milliseconds: 1000);
  static const Duration splashBrandAnchor = Duration(milliseconds: 800);

  /// Hard Timeout an toàn kỹ thuật chờ phiên đăng nhập tại Splash (1.5s)
  static const Duration splashHardTimeout = Duration(milliseconds: 1500);

  /// Khóa chống double-tap cho Push (150ms)
  static const Duration pushDebounceLock = Duration(milliseconds: 150);

  /// Tương thích ngược
  static const Duration instantTab = microFade;
  static const Duration splashReveal = splashCrossFade;
}

/// Bộ hằng số Khoảng trượt & Tỷ lệ chuẩn (Motion Distance & Scale Tokens)
class MldMotionOffsets {
  MldMotionOffsets._();

  /// Không trượt: Cho Instant, Micro-fade, Splash Ingress
  static const Offset zero = Offset.zero;

  /// Trượt ngang chi tiết: 12% bề ngang màn hình (Tránh trượt sâu 24% gây choáng thị giác)
  static const Offset drillDownSlide = Offset(0.12, 0.0);

  /// Trượt đáy Modal / BottomSheet: 18% chiều cao
  static const Offset modalSlide = Offset(0.0, 0.18);

  /// Tỷ lệ Scale cố định: Tuyệt đối không phóng to hay co nhỏ
  static const double scaleNormal = 1.0;

  /// Tỷ lệ nhấn nhẹ cho vi mô (Micro-interaction)
  static const double microPressScale = 0.98;

  /// Tương thích ngược
  static const double splashScaleBegin = 1.0;
}

/// Bộ đường cong chuyển động chuẩn (Motion Curves Tokens)
class MldMotionCurves {
  MldMotionCurves._();

  /// Đường cong tăng tốc nhanh, hãm phanh êm ái khi chạm đích
  static const Curve easeOut = Curves.easeOutCubic;

  /// Đường cong rút lui dứt khoát khi bấm Back
  static const Curve easeIn = Curves.easeInCubic;

  /// Đường cong tuyến tính cho Pure Cross-fade
  static const Curve linear = Curves.linear;

  /// Tương thích ngược
  static const Curve screenReveal = Curves.linear;
}

/// ============================================================================
/// BỘ ĐỊNH TUYẾN CHUYỂN CẢNH TRANG DÙNG CHUNG (GLOBAL PAGE TRANSITIONS)
/// ============================================================================
class AppPageTransitions {
  AppPageTransitions._();

  /// 1. Pure Cross-fade (Splash Ingress -> Trang chủ / Welcome)
  /// - Thời lượng: đúng 300ms.
  /// - Scale cố định 1.0, không scale, không trượt.
  /// - Nếu Reduce Motion bật: chuyển cảnh 0ms tức thì.
  static Route<T> pureCrossFade<T>({
    required Widget page,
    Duration duration = MldMotionDuration.splashCrossFade,
    RouteSettings? settings,
  }) {
    return PageRouteBuilder<T>(
      settings: settings,
      transitionDuration: duration,
      reverseTransitionDuration: duration,
      pageBuilder: (context, animation, secondaryAnimation) => page,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        if (MediaQuery.maybeOf(context)?.disableAnimations ?? false) {
          return child;
        }

        final curvedAnimation = CurvedAnimation(
          parent: animation,
          curve: MldMotionCurves.linear,
        );

        final fade = Tween<double>(begin: 0.0, end: 1.0).animate(curvedAnimation);

        return FadeTransition(
          opacity: fade,
          child: child,
        );
      },
    );
  }

  /// Tương thích ngược: fadeScale trỏ về pureCrossFade chuẩn 300ms Scale 1.0
  static Route<T> fadeScale<T>({
    required Widget page,
    Duration duration = MldMotionDuration.splashCrossFade,
    RouteSettings? settings,
  }) {
    return pureCrossFade(page: page, duration: duration, settings: settings);
  }

  /// 2. Hiệu ứng Trượt Chi tiết Dứt khoát (Drill-down: Chi tiết DV, Khóa học, Cơ sở)
  /// - Chiều đi (Push): Trượt ngang 12% từ phải sang trái (240ms, easeOutCubic).
  /// - Chiều về (Pop): Trượt ngược lại từ trái sang phải (190ms, easeInCubic - nhanh hơn 21%).
  /// - Nếu Back khi Push đang chạy: cancel & reverse ngay, thu dọn route khỏi stack khi xong.
  /// - Nếu Reduce Motion bật: chuyển cảnh 0ms tức thì, Offset.zero.
  static Route<T> drillDownSlide<T>({
    required Widget page,
    Duration pushDuration = MldMotionDuration.drillDownPush,
    Duration popDuration = MldMotionDuration.drillDownPop,
    RouteSettings? settings,
  }) {
    return PageRouteBuilder<T>(
      settings: settings,
      transitionDuration: pushDuration,
      reverseTransitionDuration: popDuration,
      pageBuilder: (context, animation, secondaryAnimation) => page,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        if (MediaQuery.maybeOf(context)?.disableAnimations ?? false) {
          return child;
        }

        final isReverse = animation.status == AnimationStatus.reverse;
        final curve = isReverse ? MldMotionCurves.easeIn : MldMotionCurves.easeOut;
        final curvedAnimation = CurvedAnimation(parent: animation, curve: curve);

        final slide = Tween<Offset>(
          begin: MldMotionOffsets.drillDownSlide,
          end: Offset.zero,
        ).animate(curvedAnimation);

        final fade = Tween<double>(begin: 0.0, end: 1.0).animate(curvedAnimation);

        return SlideTransition(
          position: slide,
          child: FadeTransition(
            opacity: fade,
            child: child,
          ),
        );
      },
    );
  }

  /// 3. Hiệu ứng Bảng trượt đáy Dịu dàng (Modal / BottomSheet: Đặt lịch, Lọc, Đăng nhập)
  /// - Chiều đi (Push): Trượt nhẹ từ đáy 18% lên (260ms, easeOutCubic).
  /// - Chiều về (Pop): Rút lui xuống đáy (200ms, easeInCubic - nhanh hơn 23%).
  /// - Nếu Reduce Motion bật: chuyển cảnh 0ms tức thì.
  static Route<T> modalSlideUp<T>({
    required Widget page,
    Duration pushDuration = MldMotionDuration.modalPush,
    Duration popDuration = MldMotionDuration.modalPop,
    RouteSettings? settings,
  }) {
    return PageRouteBuilder<T>(
      settings: settings,
      transitionDuration: pushDuration,
      reverseTransitionDuration: popDuration,
      pageBuilder: (context, animation, secondaryAnimation) => page,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        if (MediaQuery.maybeOf(context)?.disableAnimations ?? false) {
          return child;
        }

        final isReverse = animation.status == AnimationStatus.reverse;
        final curve = isReverse ? MldMotionCurves.easeIn : MldMotionCurves.easeOut;
        final curvedAnimation = CurvedAnimation(parent: animation, curve: curve);

        final slide = Tween<Offset>(
          begin: MldMotionOffsets.modalSlide,
          end: Offset.zero,
        ).animate(curvedAnimation);

        final fade = Tween<double>(begin: 0.0, end: 1.0).animate(curvedAnimation);

        return SlideTransition(
          position: slide,
          child: FadeTransition(
            opacity: fade,
            child: child,
          ),
        );
      },
    );
  }

  /// 4. Chuyển Tab Tức thì (Instant - 0ms)
  static Route<T> instant<T>({
    required Widget page,
    RouteSettings? settings,
  }) {
    return PageRouteBuilder<T>(
      settings: settings,
      transitionDuration: Duration.zero,
      reverseTransitionDuration: Duration.zero,
      pageBuilder: (context, animation, secondaryAnimation) => page,
    );
  }

  /// 5. Chuyển Tab Vi mô (Micro-fade <= 80ms)
  static Route<T> microFade<T>({
    required Widget page,
    Duration duration = MldMotionDuration.microFade,
    RouteSettings? settings,
  }) {
    return PageRouteBuilder<T>(
      settings: settings,
      transitionDuration: duration,
      reverseTransitionDuration: duration,
      pageBuilder: (context, animation, secondaryAnimation) => page,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        if (MediaQuery.maybeOf(context)?.disableAnimations ?? false) {
          return child;
        }

        return FadeTransition(
          opacity: animation,
          child: child,
        );
      },
    );
  }

  /// Tương thích ngược cho instantTab
  static Route<T> instantTab<T>({
    required Widget page,
    RouteSettings? settings,
  }) {
    return microFade(page: page, settings: settings);
  }
}

/// ============================================================================
/// BỘ XÂY DỰNG CHUYỂN CẢNH MẶC ĐỊNH THEO THEME (PAGE TRANSITIONS BUILDER)
/// ============================================================================
/// Tự động áp dụng chuẩn MLD Motion (12% slide ngang, easeOut/easeIn, 0ms khi Reduce Motion)
/// cho mọi MaterialPageRoute thông thường trong toàn bộ ứng dụng.
class MldPageTransitionsBuilder extends PageTransitionsBuilder {
  const MldPageTransitionsBuilder();

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    if (MediaQuery.maybeOf(context)?.disableAnimations ?? false) {
      return child;
    }

    final isReverse = animation.status == AnimationStatus.reverse;
    final curve = isReverse ? MldMotionCurves.easeIn : MldMotionCurves.easeOut;
    final curvedAnimation = CurvedAnimation(parent: animation, curve: curve);

    final slide = Tween<Offset>(
      begin: MldMotionOffsets.drillDownSlide,
      end: Offset.zero,
    ).animate(curvedAnimation);

    final fade = Tween<double>(begin: 0.0, end: 1.0).animate(curvedAnimation);

    return SlideTransition(
      position: slide,
      child: FadeTransition(
        opacity: fade,
        child: child,
      ),
    );
  }
}

/// ============================================================================
/// WIDGET TƯƠNG TÁC VI MÔ CHO NÚT BẤM / THẺ (MICRO-INTERACTION PRESS FEEDBACK)
/// ============================================================================
/// Tỷ lệ nhấn nhẹ: 0.98 -> 1.0, Đi 140ms, Về 100ms.
class MldInteractivePress extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final BorderRadius? borderRadius;

  const MldInteractivePress({
    super.key,
    required this.child,
    this.onTap,
    this.borderRadius,
  });

  @override
  State<MldInteractivePress> createState() => _MldInteractivePressState();
}

class _MldInteractivePressState extends State<MldInteractivePress>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: MldMotionDuration.micro,
      reverseDuration: MldMotionDuration.microReverse,
    );
    _scaleAnimation = Tween<double>(
      begin: 1.0,
      end: MldMotionOffsets.microPressScale,
    ).animate(
      CurvedAnimation(
        parent: _controller,
        curve: MldMotionCurves.easeOut,
        reverseCurve: MldMotionCurves.easeIn,
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onTapDown(TapDownDetails details) {
    if (widget.onTap != null) {
      _controller.forward();
    }
  }

  void _onTapUp(TapUpDetails details) {
    if (widget.onTap != null) {
      _controller.reverse();
    }
  }

  void _onTapCancel() {
    if (widget.onTap != null) {
      _controller.reverse();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.maybeOf(context)?.disableAnimations ?? false) {
      return GestureDetector(
        onTap: widget.onTap,
        child: widget.child,
      );
    }

    return GestureDetector(
      onTapDown: _onTapDown,
      onTapUp: _onTapUp,
      onTapCancel: _onTapCancel,
      onTap: widget.onTap,
      behavior: HitTestBehavior.opaque,
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: widget.child,
      ),
    );
  }
}

/// ============================================================================
/// BỘ BẢO VỆ ĐIỀU HƯỚNG TRÁNH DOUBLE-TAP (NAVIGATION DEBOUNCE GUARD)
/// ============================================================================
/// - Khóa 150ms chỉ chặn Push trùng lặp.
/// - TUYỆT ĐỐI KHÔNG CHẶN BACK.
class MldNavigationGuard {
  MldNavigationGuard._();

  static DateTime _lastPushTime = DateTime.fromMillisecondsSinceEpoch(0);

  /// Push an toàn có khóa chống double-tap 150ms
  static Future<T?> push<T>(BuildContext context, Route<T> route) {
    final now = DateTime.now();
    if (now.difference(_lastPushTime) < MldMotionDuration.pushDebounceLock) {
      return Future.value(null);
    }
    _lastPushTime = now;
    return Navigator.push<T>(context, route);
  }
}
