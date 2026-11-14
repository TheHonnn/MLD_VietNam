import 'package:flutter/material.dart';
import '../widgets/top_notification.dart';

/// Dịch vụ quản lý hiển thị thông báo trên đầu màn hình (Top Notification Toast)
/// Cho phép gọi từ bất kỳ đâu (kể cả sau khi đã đóng BottomSheet / Dialog)
class TopNotificationService {
  TopNotificationService._();

  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  static OverlayEntry? _activeEntry;

  /// Hiển thị thông báo Thành công (Màu xanh ngọc MLD, biểu tượng checkmark)
  static void showSuccess({
    BuildContext? context,
    required String message,
    String? title,
    Duration duration = const Duration(milliseconds: 3500),
  }) {
    show(
      context: context,
      message: message,
      title: title ?? 'Thành công',
      type: TopNotificationType.success,
      duration: duration,
    );
  }

  /// Hiển thị thông báo Lỗi (Màu đỏ, biểu tượng error)
  static void showError({
    BuildContext? context,
    required String message,
    String? title,
    Duration duration = const Duration(milliseconds: 4000),
  }) {
    show(
      context: context,
      message: message,
      title: title ?? 'Lỗi',
      type: TopNotificationType.error,
      duration: duration,
    );
  }

  /// Hiển thị thông báo Cảnh báo (Màu vàng hổ phách, biểu tượng warning)
  static void showWarning({
    BuildContext? context,
    required String message,
    String? title,
    Duration duration = const Duration(milliseconds: 3500),
  }) {
    show(
      context: context,
      message: message,
      title: title ?? 'Cảnh báo',
      type: TopNotificationType.warning,
      duration: duration,
    );
  }

  /// Hiển thị thông báo Thông tin (Màu xanh dương, biểu tượng info)
  static void showInfo({
    BuildContext? context,
    required String message,
    String? title,
    Duration duration = const Duration(milliseconds: 3500),
  }) {
    show(
      context: context,
      message: message,
      title: title ?? 'Thông báo',
      type: TopNotificationType.info,
      duration: duration,
    );
  }

  /// Hàm điều phối tạo và gắn OverlayEntry lên trên cùng màn hình
  static void show({
    BuildContext? context,
    required String message,
    String? title,
    TopNotificationType type = TopNotificationType.success,
    Duration duration = const Duration(milliseconds: 3500),
  }) {
    // Nếu đang có thông báo cũ hiển thị thì gỡ bỏ ngay
    dismiss();

    OverlayState? overlayState;

    if (context != null && context.mounted) {
      overlayState = Overlay.maybeOf(context, rootOverlay: true);
    }

    overlayState ??= navigatorKey.currentState?.overlay;

    if (overlayState == null) return;

    late OverlayEntry entry;
    entry = OverlayEntry(
      builder: (ctx) => TopNotification(
        message: message,
        title: title,
        type: type,
        duration: duration,
        onDismissed: () {
          if (_activeEntry == entry) {
            entry.remove();
            _activeEntry = null;
          }
        },
      ),
    );

    _activeEntry = entry;
    overlayState.insert(entry);
  }

  /// Đóng thông báo đang hiển thị
  static void dismiss() {
    try {
      _activeEntry?.remove();
    } catch (_) {}
    _activeEntry = null;
  }
}
