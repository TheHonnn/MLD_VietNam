import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medical_healthcare_app/core/network/api_client.dart';
import 'package:medical_healthcare_app/core/network/api_endpoints.dart';
import 'package:medical_healthcare_app/core/network/api_exception.dart';
import 'package:medical_healthcare_app/core/services/auth_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ApiException Tests', () {
    test('converts connection timeout to 408 ApiException', () {
      final dioException = DioException(
        requestOptions: RequestOptions(path: '/test'),
        type: DioExceptionType.connectionTimeout,
      );

      final apiException = ApiException.fromDioException(dioException);

      expect(apiException.statusCode, 408);
      expect(apiException.message, contains('quá hạn'));
    });

    test('parses 400 bad request error response with custom message', () {
      final dioException = DioException(
        requestOptions: RequestOptions(path: '/test'),
        type: DioExceptionType.badResponse,
        response: Response(
          requestOptions: RequestOptions(path: '/test'),
          statusCode: 400,
          data: {'message': 'Số điện thoại không đúng định dạng'},
        ),
      );

      final apiException = ApiException.fromDioException(dioException);

      expect(apiException.statusCode, 400);
      expect(apiException.message, 'Số điện thoại không đúng định dạng');
    });

    test('parses 401 unauthorized error response', () {
      final dioException = DioException(
        requestOptions: RequestOptions(path: '/user/profile'),
        type: DioExceptionType.badResponse,
        response: Response(
          requestOptions: RequestOptions(path: '/user/profile'),
          statusCode: 401,
        ),
      );

      final apiException = ApiException.fromDioException(dioException);

      expect(apiException.statusCode, 401);
      expect(apiException.message, contains('Phiên đăng nhập đã hết hạn'));
    });

    test('parses 422 validation error with field errors', () {
      final dioException = DioException(
        requestOptions: RequestOptions(path: '/booking/create'),
        type: DioExceptionType.badResponse,
        response: Response(
          requestOptions: RequestOptions(path: '/booking/create'),
          statusCode: 422,
          data: {
            'message': 'Dữ liệu không hợp lệ',
            'errors': {'date': 'Ngày khám không thể trong quá khứ'},
          },
        ),
      );

      final apiException = ApiException.fromDioException(dioException);

      expect(apiException.statusCode, 422);
      expect(apiException.errors?['date'], 'Ngày khám không thể trong quá khứ');
    });

    test('parses 500 server error', () {
      final dioException = DioException(
        requestOptions: RequestOptions(path: '/courses'),
        type: DioExceptionType.badResponse,
        response: Response(
          requestOptions: RequestOptions(path: '/courses'),
          statusCode: 500,
        ),
      );

      final apiException = ApiException.fromDioException(dioException);

      expect(apiException.statusCode, 500);
      expect(apiException.message, contains('Hệ thống máy chủ'));
    });
  });

  group('AuthService Tests', () {
    setUp(() {
      FlutterSecureStorage.setMockInitialValues({});
      SharedPreferences.setMockInitialValues({});
    });

    test('initial state is unauthenticated', () async {
      final authService = AuthService.instance;
      await authService.init();

      expect(authService.isLoggedIn, isFalse);
      expect(await authService.checkAutoLogin(), isFalse);
      expect(authService.hasCompletedOnboarding, isFalse);
    });

    test('saving session sets authenticated status and persists details', () async {
      final authService = AuthService.instance;
      await authService.init();

      await authService.saveSession(
        accessToken: 'jwt_token_test_123',
        refreshToken: 'refresh_test_456',
        userId: 'user_007',
        phone: '0912345678',
        displayName: 'Nguyễn Văn A',
      );

      expect(authService.isLoggedIn, isTrue);
      expect(await authService.getAccessToken(), 'jwt_token_test_123');
      expect(await authService.getRefreshToken(), 'refresh_test_456');
      expect(authService.currentUserId, 'user_007');
      expect(authService.currentPhone, '0912345678');
      expect(authService.currentDisplayName, 'Nguyễn Văn A');
      expect(await authService.checkAutoLogin(), isTrue);
    });

    test('updating profile updates cached and stored values', () async {
      final authService = AuthService.instance;
      await authService.init();

      await authService.saveSession(
        accessToken: 'jwt_token_test_123',
        displayName: 'Nguyễn Văn A',
      );

      await authService.updateProfile(
        displayName: 'Nguyễn Văn B',
        avatarUrl: 'assets/images/avatar.png',
      );

      expect(authService.currentDisplayName, 'Nguyễn Văn B');
      expect(authService.currentAvatarUrl, 'assets/images/avatar.png');
    });

    test('logout clears secure tokens and authentication flags', () async {
      final authService = AuthService.instance;
      await authService.init();

      await authService.saveSession(
        accessToken: 'jwt_token_test_123',
        userId: 'user_007',
      );

      expect(authService.isLoggedIn, isTrue);

      await authService.logout();

      expect(authService.isLoggedIn, isFalse);
      expect(await authService.getAccessToken(), isNull);
      expect(authService.currentUserId, isNull);
      expect(await authService.checkAutoLogin(), isFalse);
    });

    test('completed onboarding flag works properly', () async {
      final authService = AuthService.instance;
      await authService.init();

      expect(authService.hasCompletedOnboarding, isFalse);

      await authService.setCompletedOnboarding(true);
      expect(authService.hasCompletedOnboarding, isTrue);
    });
  });

  group('ApiClient Tests', () {
    setUp(() {
      FlutterSecureStorage.setMockInitialValues({});
      SharedPreferences.setMockInitialValues({});
    });

    test('ApiClient singleton initializes with correct default base URL', () {
      final client = ApiClient.instance;
      expect(client.dio.options.baseUrl, ApiEndpoints.baseUrl);
      expect(client.dio.options.headers['Content-Type'], 'application/json');
    });

    test('ApiClient updates base URL when requested', () {
      final client = ApiClient.instance;
      client.updateBaseUrl('https://api-dev.mld.vn/api');
      expect(client.dio.options.baseUrl, 'https://api-dev.mld.vn/api');

      // Reset back
      client.updateBaseUrl(ApiEndpoints.baseUrl);
    });
  });
}

