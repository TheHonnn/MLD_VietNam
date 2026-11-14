import 'package:flutter/material.dart';
import '../theme/app_typography.dart';

enum TopNotificationType {
  success,
  error,
  info,
  warning,
}

/// Banner thông báo trên đầu màn hình (Top Notification Banner)
/// - Trượt mượt mà từ trên xuống
/// - Có thể vuốt lên để biến mất ngay lập tức (Swipe to dismiss)
/// - Tự động biến mất sau thời gian định sẵn
/// - Thanh thông báo bên dưới có nút tròn đổi màu lùi dần theo thời gian (Countdown Progress with Knob)
class TopNotification extends StatefulWidget {
  final String message;
  final String? title;
  final TopNotificationType type;
  final Duration duration;
  final VoidCallback onDismissed;

  const TopNotification({
    super.key,
    required this.message,
    this.title,
    this.type = TopNotificationType.success,
    this.duration = const Duration(milliseconds: 3500),
    required this.onDismissed,
  });

  @override
  State<TopNotification> createState() => _TopNotificationState();
}

class _TopNotificationState extends State<TopNotification> with TickerProviderStateMixin {
  late final AnimationController _slideController;
  late final Animation<Offset> _slideAnimation;
  late final Animation<double> _fadeAnimation;
  late final AnimationController _progressController;

  bool _isDismissing = false;

  @override
  void initState() {
    super.initState();

    _slideController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 220),
      reverseDuration: const Duration(milliseconds: 200),
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, -1.25),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _slideController,
      curve: Curves.easeOutCubic,
      reverseCurve: Curves.easeInCubic,
    ));

    _fadeAnimation = CurvedAnimation(
      parent: _slideController,
      curve: Curves.easeOut,
      reverseCurve: Curves.easeIn,
    );

    _progressController = AnimationController(
      vsync: this,
      duration: widget.duration,
    );

    // Trượt từ trên xuống
    _slideController.forward();

    // Khởi chạy thanh lùi thời gian (1.0 -> 0.0)
    _progressController.value = 1.0;
    _progressController.reverse(from: 1.0);

    _progressController.addStatusListener((status) {
      if (status == AnimationStatus.dismissed) {
        _dismiss();
      }
    });
  }

  void _dismiss() {
    if (_isDismissing) return;
    _isDismissing = true;
    _slideController.reverse().then((_) {
      if (mounted) {
        widget.onDismissed();
      }
    });
  }

  /// Hàm đổi màu động lùi dần theo thời gian biến mất:
  /// - Ban đầu (1.0 -> 0.5): Xanh ngọc lục bảo MLD (#00693F) -> Xanh cổ vịt Teal (#0D9488)
  /// - Về cuối (0.5 -> 0.0): Xanh cổ vịt -> Vàng hổ phách Amber (#F59E0B)
  Color _getProgressColor(double progress) {
    if (widget.type == TopNotificationType.error) {
      return Color.lerp(const Color(0xFFDC2626), const Color(0xFFEF4444), progress)!;
    }
    if (widget.type == TopNotificationType.warning) {
      return Color.lerp(const Color(0xFFD97706), const Color(0xFFFBBF24), progress)!;
    }
    if (widget.type == TopNotificationType.info) {
      return Color.lerp(const Color(0xFF0284C7), const Color(0xFF38BDF8), progress)!;
    }

    if (progress > 0.5) {
      return Color.lerp(const Color(0xFF0D9488), const Color(0xFF00693F), (progress - 0.5) * 2)!;
    } else {
      return Color.lerp(const Color(0xFFF59E0B), const Color(0xFF0D9488), progress * 2)!;
    }
  }

  @override
  void dispose() {
    _slideController.dispose();
    _progressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final topPadding = mediaQuery.padding.top;

    Color iconBg;
    Color iconColor;
    IconData icon;
    String defaultTitle;

    switch (widget.type) {
      case TopNotificationType.success:
        iconBg = const Color(0xFFE8F6ED);
        iconColor = const Color(0xFF00693F);
        icon = Icons.check_circle_rounded;
        defaultTitle = 'Thành công';
        break;
      case TopNotificationType.error:
        iconBg = const Color(0xFFFEE2E2);
        iconColor = const Color(0xFFDC2626);
        icon = Icons.error_rounded;
        defaultTitle = 'Thông báo lỗi';
        break;
      case TopNotificationType.warning:
        iconBg = const Color(0xFFFEF3C7);
        iconColor = const Color(0xFFD97706);
        icon = Icons.warning_rounded;
        defaultTitle = 'Cảnh báo';
        break;
      case TopNotificationType.info:
        iconBg = const Color(0xFFEFF6FF);
        iconColor = const Color(0xFF0284C7);
        icon = Icons.info_rounded;
        defaultTitle = 'Thông báo';
        break;
    }

    return Positioned(
      top: topPadding + 8,
      left: 14,
      right: 14,
      child: SlideTransition(
        position: _slideAnimation,
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: GestureDetector(
            onVerticalDragUpdate: (details) {
              // Vuốt lên trên để cho thông báo biến mất
              if (details.primaryDelta! < -3) {
                _dismiss();
              }
            },
            child: Material(
              color: Colors.white,
              elevation: 10,
              shadowColor: Colors.black.withValues(alpha: 0.35),
              borderRadius: BorderRadius.circular(16),
              clipBehavior: Clip.antiAlias,
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE5E7EB), width: 1),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(14, 12, 10, 11),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: iconBg,
                              shape: BoxShape.circle,
                            ),
                            child: Icon(icon, color: iconColor, size: 21),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  widget.title ?? defaultTitle,
                                  style: AppTypography.zaloFont(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: const Color(0xFF111827),
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  widget.message,
                                  style: AppTypography.zaloFont(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w400,
                                    color: const Color(0xFF4B5563),
                                    height: 1.35,
                                  ),
                                  maxLines: 3,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 6),
                          InkWell(
                            onTap: _dismiss,
                            borderRadius: BorderRadius.circular(16),
                            child: const Padding(
                              padding: EdgeInsets.all(6),
                              child: Icon(
                                Icons.close_rounded,
                                size: 18,
                                color: Color(0xFF9CA3AF),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // THANH THÔNG BÁO BÊN DƯỚI VỚI NÚT ĐỔI MÀU LÙI THEO THỜI GIAN
                    AnimatedBuilder(
                      animation: _progressController,
                      builder: (context, _) {
                        final progress = _progressController.value;
                        final currentColor = _getProgressColor(progress);

                        return Container(
                          height: 4,
                          width: double.infinity,
                          color: const Color(0xFFF3F4F6),
                          child: LayoutBuilder(
                            builder: (context, constraints) {
                              final totalWidth = constraints.maxWidth;
                              final currentWidth = (totalWidth * progress).clamp(0.0, totalWidth);

                              return Stack(
                                clipBehavior: Clip.none,
                                children: [
                                  // Thanh tiến trình co lùi dần từ phải sang trái
                                  Container(
                                    width: currentWidth,
                                    height: 4,
                                    decoration: BoxDecoration(
                                      color: currentColor,
                                      borderRadius: const BorderRadius.horizontal(
                                        right: Radius.circular(2),
                                      ),
                                    ),
                                  ),
                                  // Nút đổi màu lùi theo thời gian biến mất
                                  if (currentWidth > 6)
                                    Positioned(
                                      left: currentWidth - 4,
                                      top: -2.5,
                                      child: Container(
                                        width: 9,
                                        height: 9,
                                        decoration: BoxDecoration(
                                          color: currentColor,
                                          shape: BoxShape.circle,
                                          border: Border.all(color: Colors.white, width: 1.5),
                                          boxShadow: [
                                            BoxShadow(
                                              color: currentColor.withValues(alpha: 0.55),
                                              blurRadius: 4,
                                              spreadRadius: 1,
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                ],
                              );
                            },
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
