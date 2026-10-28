import 'package:flutter/services.dart';

/// Dịch vụ bảo mật bản quyền khóa học & ứng dụng MLD Việt Nam:
/// - Chặn quay màn hình và chụp ảnh màn hình (Android FLAG_SECURE)
/// - Chống click chuột phải & menu ngữ cảnh sao chép
class AppSecurityService {
  AppSecurityService._();
  static final AppSecurityService instance = AppSecurityService._();

  static const MethodChannel _channel = MethodChannel('vn.mldvietnam.app/security');

  /// Kích hoạt cấm chụp ảnh và quay phim màn hình (FLAG_SECURE)
  Future<void> enableSecureScreen() async {
    try {
      await _channel.invokeMethod('enableSecure');
    } catch (_) {}
  }

  /// Tắt cấm quay chụp nếu cần
  Future<void> disableSecureScreen() async {
    try {
      await _channel.invokeMethod('disableSecure');
    } catch (_) {}
  }
}

