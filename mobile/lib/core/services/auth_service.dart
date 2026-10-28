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

  // Hybrid fallback keys in SharedPreferences
  static const String _keyCachedToken = 'mld_cached_token';
  static const String _keyCachedRefreshToken = 'mld_cached_refresh_token';
  static const String _keyCachedUserId = 'mld_cached_user_id';
  static const String _keyCachedPhone = 'mld_cached_phone';

  // Remember last login identifier
  static const String _keyLastLoginPhone = 'last_login_phone';
  static const String _keyLastLoginEmail = 'last_login_email';
  static const String _keyLastLoginMethod = 'last_login_method';

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
  String? get lastLoginPhone => _prefs?.getString(_keyLastLoginPhone);
  String? get lastLoginEmail => _prefs?.getString(_keyLastLoginEmail);
  String? get lastLoginMethod => _prefs?.getString(_keyLastLoginMethod);

  /// Save last login credentials / method
  Future<void> saveLastLogin({
    String? phone,
    String? email,
    String? method,
  }) async {
    if (phone != null && phone.isNotEmpty) {
      await _prefs?.setString(_keyLastLoginPhone, phone);
    }
    if (email != null && email.isNotEmpty) {
      await _prefs?.setString(_keyLastLoginEmail, email);
    }
    if (method != null && method.isNotEmpty) {
      await _prefs?.setString(_keyLastLoginMethod, method);
    }
  }

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
    } catch (e) {
      debugPrint('Error reading secure storage: $e');
      _cachedAccessToken = null;
    }

    // Hybrid fallback from SharedPreferences if secure storage is null/empty
    _cachedAccessToken ??= _prefs?.getString(_keyCachedToken);
    _cachedRefreshToken ??= _prefs?.getString(_keyCachedRefreshToken);
    _cachedUserId ??= _prefs?.getString(_keyCachedUserId);
    _cachedPhone ??= _prefs?.getString(_keyCachedPhone);

    phoneNotifier.value = _cachedPhone;

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
    } catch (_) {
      _cachedAccessToken = null;
    }
    _cachedAccessToken ??= _prefs?.getString(_keyCachedToken);
    return _cachedAccessToken;
  }

  /// Get active refresh token
  Future<String?> getRefreshToken() async {
    if (_cachedRefreshToken != null && _cachedRefreshToken!.isNotEmpty) {
      return _cachedRefreshToken;
    }
    try {
      _cachedRefreshToken = await _secureStorage.read(key: _keyRefreshToken);
    } catch (_) {
      _cachedRefreshToken = null;
    }
    _cachedRefreshToken ??= _prefs?.getString(_keyCachedRefreshToken);
    return _cachedRefreshToken;
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
      await _prefs!.setString(_keyCachedToken, accessToken);
      if (refreshToken != null) {
        await _prefs!.setString(_keyCachedRefreshToken, refreshToken);
      }
      if (userId != null) {
        await _prefs!.setString(_keyCachedUserId, userId);
      }
      if (phone != null) {
        await _prefs!.setString(_keyCachedPhone, phone);
        await _prefs!.setString('user_phone', phone);
        await saveLastLogin(phone: phone, method: 'phone');
      }
      if (displayName != null) {
        await _prefs!.setString(_keyDisplayName, displayName);
        await _prefs!.setString('user_full_name', displayName);
      }
      if (avatarUrl != null) {
        await _prefs!.setString(_keyAvatarUrl, avatarUrl);
        await _prefs!.setString('user_avatar_url', avatarUrl);
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
    await _prefs?.setString(_keyCachedPhone, cleanPhone);
    await _prefs?.setString('user_phone', cleanPhone);

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
    try {
      await _secureStorage.write(key: _keyAccessToken, value: newAccessToken);
    } catch (e) {
      debugPrint('Error writing new access token to secure storage: $e');
    }
    await _prefs?.setString(_keyCachedToken, newAccessToken);

    if (newRefreshToken != null && newRefreshToken.isNotEmpty) {
      _cachedRefreshToken = newRefreshToken;
      try {
        await _secureStorage.write(key: _keyRefreshToken, value: newRefreshToken);
      } catch (e) {
        debugPrint('Error writing new refresh token to secure storage: $e');
      }
      await _prefs?.setString(_keyCachedRefreshToken, newRefreshToken);
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
      await _prefs!.remove(_keyCachedToken);
      await _prefs!.remove(_keyCachedRefreshToken);
      await _prefs!.remove(_keyCachedUserId);
      await _prefs!.remove(_keyCachedPhone);
      // Keep _keyCompletedOnboarding, _keyLastLoginPhone, _keyLastLoginEmail, _keyLastLoginMethod
    }

    isLoggedInNotifier.value = false;
  }

  /// Delete user account permanently and clear all stored data
  /// Compliant with Apple Review Guideline 5.1.1(v) & Google Play Data Safety
  Future<bool> deleteAccount() async {
    try {
      final token = await getAccessToken();
      if (token != null && token.isNotEmpty) {
        await ApiClient.instance.delete(ApiEndpoints.authDeleteAccount);
      }
    } catch (e) {
      debugPrint('Error deleting account on backend: $e');
    }

    // Luôn dọn dẹp sạch sẽ toàn bộ local state và secure storage
    await logout();

    if (_prefs != null) {
      await _prefs!.remove('user_phone');
      await _prefs!.remove('user_full_name');
      await _prefs!.remove('user_avatar_url');
      await _prefs!.remove(_keyDisplayName);
      await _prefs!.remove(_keyAvatarUrl);
      await _prefs!.remove(_keyLastLoginPhone);
      await _prefs!.remove(_keyLastLoginEmail);
      await _prefs!.remove(_keyLastLoginMethod);
    }

    return true;
  }
}
