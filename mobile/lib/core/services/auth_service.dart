import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../network/api_client.dart';
import '../network/api_endpoints.dart';

/// Service managing user session, secure token storage, and authentication state
class AuthService {
  AuthService._internal();
  static final AuthService instance = AuthService._internal();
  factory AuthService() => instance;

  static const String _keyAccessToken = 'mld_access_token';
  static const String _keyRefreshToken = 'mld_refresh_token';
  static const String _keyUserId = 'mld_user_id';
  static const String _keyUserPhone = 'mld_user_phone';
  static const String _keyIsLoggedIn = 'is_logged_in';
  static const String _keyCompletedOnboarding = 'has_completed_onboarding';
  static const String _keyDisplayName = 'user_display_name';
  static const String _keyAvatarUrl = 'user_avatar_path';

  FlutterSecureStorage _secureStorage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  SharedPreferences? _prefs;

  // In-memory cache for fast synchronous access
  String? _cachedAccessToken;
  String? _cachedRefreshToken;
  String? _cachedUserId;
  String? _cachedPhone;
  String? _cachedDisplayName;
  String? _cachedAvatarUrl;
  bool _hasCompletedOnboarding = false;

  /// Reactive notifier for authentication status changes
  final ValueNotifier<bool> isLoggedInNotifier = ValueNotifier<bool>(false);

  /// Reactive notifier for phone number updates
  final ValueNotifier<String?> phoneNotifier = ValueNotifier<String?>(null);

  bool get isLoggedIn => isLoggedInNotifier.value;
  bool get hasCompletedOnboarding => _hasCompletedOnboarding;
  String? get currentPhone => _cachedPhone;
  bool get hasPhoneNumber => _cachedPhone != null && _cachedPhone!.trim().isNotEmpty;
  String? get currentDisplayName => _cachedDisplayName;
  String? get currentAvatarUrl => _cachedAvatarUrl;
  String? get currentUserId => _cachedUserId;

  /// Initialize storage and restore existing session
  Future<void> init({
    FlutterSecureStorage? secureStorage,
    SharedPreferences? sharedPreferences,
  }) async {
    if (secureStorage != null) {
      _secureStorage = secureStorage;
    }
    _prefs = sharedPreferences ?? await SharedPreferences.getInstance();

    _hasCompletedOnboarding = _prefs?.getBool(_keyCompletedOnboarding) ?? false;
    _cachedDisplayName = _prefs?.getString(_keyDisplayName);
    _cachedAvatarUrl = _prefs?.getString(_keyAvatarUrl);

    try {
      _cachedAccessToken = await _secureStorage.read(key: _keyAccessToken);
      _cachedRefreshToken = await _secureStorage.read(key: _keyRefreshToken);
      _cachedUserId = await _secureStorage.read(key: _keyUserId);
      _cachedPhone = await _secureStorage.read(key: _keyUserPhone);
      phoneNotifier.value = _cachedPhone;
    } catch (e) {
      debugPrint('Error reading secure storage: $e');
      _cachedAccessToken = null;
    }

    final hasToken = _cachedAccessToken != null && _cachedAccessToken!.isNotEmpty;
    final loggedInFlag = _prefs?.getBool(_keyIsLoggedIn) ?? false;

    isLoggedInNotifier.value = hasToken && loggedInFlag;
  }

  /// Get active access token (for API requests)
  Future<String?> getAccessToken() async {
    if (_cachedAccessToken != null && _cachedAccessToken!.isNotEmpty) {
      return _cachedAccessToken;
    }
    try {
      _cachedAccessToken = await _secureStorage.read(key: _keyAccessToken);
      return _cachedAccessToken;
    } catch (_) {
      return null;
    }
  }

  /// Get active refresh token
  Future<String?> getRefreshToken() async {
    if (_cachedRefreshToken != null && _cachedRefreshToken!.isNotEmpty) {
      return _cachedRefreshToken;
    }
    try {
      _cachedRefreshToken = await _secureStorage.read(key: _keyRefreshToken);
      return _cachedRefreshToken;
    } catch (_) {
      return null;
    }
  }

  /// Save session after successful login or profile creation
  Future<void> saveSession({
    required String accessToken,
    String? refreshToken,
    String? userId,
    String? phone,
    String? displayName,
    String? avatarUrl,
  }) async {
    _cachedAccessToken = accessToken;
    if (refreshToken != null) _cachedRefreshToken = refreshToken;
    if (userId != null) _cachedUserId = userId;
    if (phone != null) {
      _cachedPhone = phone;
      phoneNotifier.value = phone;
    }
    if (displayName != null) _cachedDisplayName = displayName;
    if (avatarUrl != null) _cachedAvatarUrl = avatarUrl;

    try {
      await _secureStorage.write(key: _keyAccessToken, value: accessToken);
      if (refreshToken != null) {
        await _secureStorage.write(key: _keyRefreshToken, value: refreshToken);
      }
      if (userId != null) {
        await _secureStorage.write(key: _keyUserId, value: userId);
      }
      if (phone != null) {
        await _secureStorage.write(key: _keyUserPhone, value: phone);
      }
    } catch (e) {
      debugPrint('Error writing to secure storage: $e');
    }

    if (_prefs != null) {
      await _prefs!.setBool(_keyIsLoggedIn, true);
      if (displayName != null) {
        await _prefs!.setString(_keyDisplayName, displayName);
        await _prefs!.setString('user_full_name', displayName);
      }
      if (avatarUrl != null) {
        await _prefs!.setString(_keyAvatarUrl, avatarUrl);
        await _prefs!.setString('user_avatar_url', avatarUrl);
      }
      if (phone != null) {
        await _prefs!.setString('user_phone', phone);
      }
    }

    isLoggedInNotifier.value = true;
  }

  /// Update user's phone number locally and persist to backend
  Future<bool> updatePhone(String phone) async {
    final cleanPhone = phone.trim().replaceAll(' ', '');
    _cachedPhone = cleanPhone;
    phoneNotifier.value = cleanPhone;

    try {
      await _secureStorage.write(key: _keyUserPhone, value: cleanPhone);
    } catch (e) {
      debugPrint('Error writing phone to secure storage: $e');
    }

    // Gửi yêu cầu cập nhật lên Backend Gateway NestJS nếu đang đăng nhập
    try {
      final token = await getAccessToken();
      if (token != null && token.isNotEmpty) {
        await ApiClient.instance.patch(
          ApiEndpoints.authPhone,
          data: {'phone': cleanPhone},
        );
      }
      return true;
    } catch (e) {
      debugPrint('Error updating phone to backend: $e');
      // Vẫn coi là thành công cục bộ để người dùng tiếp tục thao tác không bị gián đoạn
      return true;
    }
  }

  /// Update cached and persistent user profile information
  Future<void> updateProfile({
    String? displayName,
    String? avatarUrl,
  }) async {
    if (displayName != null) {
      _cachedDisplayName = displayName;
      await _prefs?.setString(_keyDisplayName, displayName);
    }
    if (avatarUrl != null) {
      _cachedAvatarUrl = avatarUrl;
      await _prefs?.setString(_keyAvatarUrl, avatarUrl);
    }
  }

  /// Update active session with newly rotated tokens
  Future<void> refreshSession({
    required String newAccessToken,
    String? newRefreshToken,
  }) async {
    _cachedAccessToken = newAccessToken;
    await _secureStorage.write(key: _keyAccessToken, value: newAccessToken);

    if (newRefreshToken != null && newRefreshToken.isNotEmpty) {
      _cachedRefreshToken = newRefreshToken;
      await _secureStorage.write(key: _keyRefreshToken, value: newRefreshToken);
    }
  }

  /// Check whether the user has a valid active session to auto-login
  Future<bool> checkAutoLogin() async {
    final token = await getAccessToken();
    final loggedInFlag = _prefs?.getBool(_keyIsLoggedIn) ?? false;
    final canAutoLogin = token != null && token.isNotEmpty && loggedInFlag;
    isLoggedInNotifier.value = canAutoLogin;
    return canAutoLogin;
  }

  /// Mark onboarding flow as completed
  Future<void> setCompletedOnboarding(bool completed) async {
    _hasCompletedOnboarding = completed;
    await _prefs?.setBool(_keyCompletedOnboarding, completed);
  }

  /// Clear session data upon user logout
  Future<void> logout() async {
    _cachedAccessToken = null;
    _cachedRefreshToken = null;
    _cachedUserId = null;
    _cachedPhone = null;
    phoneNotifier.value = null;

    try {
      await _secureStorage.delete(key: _keyAccessToken);
      await _secureStorage.delete(key: _keyRefreshToken);
      await _secureStorage.delete(key: _keyUserId);
      await _secureStorage.delete(key: _keyUserPhone);
    } catch (e) {
      debugPrint('Error deleting secure storage keys: $e');
    }

    if (_prefs != null) {
      await _prefs!.setBool(_keyIsLoggedIn, false);
      // Keep _keyCompletedOnboarding so user goes to Login directly
    }

    isLoggedInNotifier.value = false;
  }
}
