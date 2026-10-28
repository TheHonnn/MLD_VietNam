import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/auth_service.dart';
import 'api_endpoints.dart';
import 'api_exception.dart';

/// Centralized API HTTP Client configured with Dio, Bearer token injection, and error handling
class ApiClient {
  ApiClient._internal() {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiEndpoints.baseUrl,
        connectTimeout: const Duration(seconds: 35),
        receiveTimeout: const Duration(seconds: 35),
        sendTimeout: const Duration(seconds: 35),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'apikey': ApiEndpoints.supabaseAnonKey,
          'Prefer': 'return=representation',
        },
      ),
    );

    _setupInterceptors();
  }

  static final ApiClient instance = ApiClient._internal();
  factory ApiClient() => instance;

  late final Dio _dio;

  Dio get dio => _dio;

  /// Setup Interceptors for Supabase apikey, Bearer Token, Accept-Language and Queued 401 Token Refresh
  void _setupInterceptors() {
    _dio.interceptors.add(
      QueuedInterceptorsWrapper(
        onRequest: (options, handler) async {
          // 0. Xác định tuyến Backend Gateway NestJS
          final isNestBackendRoute = (options.path.startsWith('/auth/') && !options.path.startsWith('/auth/v1/')) ||
              options.path.startsWith('/academy/') ||
              options.path.startsWith('/treatment/') ||
              options.path.startsWith('/membership/') ||
              options.path.startsWith('/bookings') ||
              options.path.startsWith('/appointments') ||
              options.path.startsWith('/payments');

          if (isNestBackendRoute) {
            var backendBase = ApiEndpoints.backendBaseUrl.replaceAll(RegExp(r'/+$'), '');
            if (!backendBase.endsWith('/api/v1')) {
              backendBase = '$backendBase/api/v1';
            }
            options.baseUrl = '';
            options.path = '$backendBase${options.path}';
          }

          // 1. Luôn bảo đảm apikey cho Supabase
          if (!options.headers.containsKey('apikey')) {
            options.headers['apikey'] = ApiEndpoints.supabaseAnonKey;
          }

          // 2. Tự động đính kèm Accept-Language
          if (!options.headers.containsKey('Accept-Language')) {
            try {
              final prefs = await SharedPreferences.getInstance();
              final lang = prefs.getString('app_language_code') ?? 'vi';
              options.headers['Accept-Language'] = lang;
            } catch (_) {
              options.headers['Accept-Language'] = 'vi';
            }
          }

          // 3. Đính kèm Bearer token người dùng nếu đã đăng nhập
          if (!options.headers.containsKey('Authorization')) {
            final token = await AuthService.instance.getAccessToken();
            if (token != null && token.isNotEmpty) {
              options.headers['Authorization'] = 'Bearer $token';
            } else if (!isNestBackendRoute) {
              // Chỉ đính kèm Supabase Anon Key đối với các request trực tiếp đến Supabase
              options.headers['Authorization'] = 'Bearer ${ApiEndpoints.supabaseAnonKey}';
            }
          }
          return handler.next(options);
        },
        onResponse: (response, handler) {
          return handler.next(response);
        },
        onError: (DioException error, handler) async {
          // Xử lý 401 Unauthorized: Kích hoạt Silent Refresh tự động
          if (error.response?.statusCode == 401) {
            final path = error.requestOptions.path;
            final isAuthBypassRoute = path.contains(ApiEndpoints.sendOtp) ||
                path.contains(ApiEndpoints.verifyOtp) ||
                path.contains(ApiEndpoints.authLogin) ||
                path.contains(ApiEndpoints.authLoginEmail) ||
                path.contains(ApiEndpoints.authRegister) ||
                path.contains(ApiEndpoints.authRegisterEmail) ||
                path.contains(ApiEndpoints.authRefresh) ||
                path.contains(ApiEndpoints.authForgotPassword) ||
                path.contains(ApiEndpoints.authResetPassword) ||
                path.contains(ApiEndpoints.authChangePassword);

            if (!isAuthBypassRoute) {
              final currentRefreshToken = await AuthService.instance.getRefreshToken();
              if (currentRefreshToken != null && currentRefreshToken.isNotEmpty) {
                try {
                  // Sử dụng Dio riêng biệt để gọi refresh, tránh lặp interceptor
                  final refreshDio = Dio(
                    BaseOptions(
                      baseUrl: _dio.options.baseUrl,
                      connectTimeout: const Duration(seconds: 10),
                      receiveTimeout: const Duration(seconds: 10),
                      headers: {
                        'Content-Type': 'application/json',
                        'apikey': ApiEndpoints.supabaseAnonKey,
                      },
                    ),
                  );

                  final refreshResponse = await refreshDio.post(
                    ApiEndpoints.authRefresh,
                    data: {'refreshToken': currentRefreshToken},
                  );

                  if (refreshResponse.statusCode == 200 && refreshResponse.data != null) {
                    final newAccessToken = refreshResponse.data['accessToken'] as String?;
                    final newRefreshToken = refreshResponse.data['refreshToken'] as String?;

                    if (newAccessToken != null && newAccessToken.isNotEmpty) {
                      // Lưu token mới đã rotate
                      await AuthService.instance.refreshSession(
                        newAccessToken: newAccessToken,
                        newRefreshToken: newRefreshToken,
                      );

                      // Cập nhật header Authorization cho request ban đầu bị lỗi và retry
                      final requestOptions = error.requestOptions;
                      requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';

                      final clonedResponse = await _dio.fetch(requestOptions);
                      return handler.resolve(clonedResponse);
                    }
                  }
                } catch (refreshErr) {
                  // Chỉ kích hoạt Logout nếu Backend trả 401 hoặc 403 xác nhận Refresh Token hết hạn/bị thu hồi
                  if (refreshErr is DioException &&
                      (refreshErr.response?.statusCode == 401 ||
                          refreshErr.response?.statusCode == 403)) {
                    await AuthService.instance.logout();
                  }
                  return handler.next(error);
                }
              }

              // Không tự tiện silent logout nếu không có refresh token (tránh mất phiên offline/mock)
            }
          }
          return handler.next(error);
        },
      ),
    );
  }

  /// Update base URL dynamically (e.g. for development or emulator)
  void updateBaseUrl(String newBaseUrl) {
    _dio.options.baseUrl = newBaseUrl;
  }

  /// GET request
  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    ProgressCallback? onReceiveProgress,
  }) async {
    try {
      return await _dio.get<T>(
        path,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
        onReceiveProgress: onReceiveProgress,
      );
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    } catch (e) {
      throw ApiException(message: e.toString());
    }
  }

  /// POST request
  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    try {
      return await _dio.post<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
        onSendProgress: onSendProgress,
        onReceiveProgress: onReceiveProgress,
      );
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    } catch (e) {
      throw ApiException(message: e.toString());
    }
  }

  /// PUT request
  Future<Response<T>> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    try {
      return await _dio.put<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
        onSendProgress: onSendProgress,
        onReceiveProgress: onReceiveProgress,
      );
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    } catch (e) {
      throw ApiException(message: e.toString());
    }
  }

  /// PATCH request
  Future<Response<T>> patch<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    ProgressCallback? onSendProgress,
    ProgressCallback? onReceiveProgress,
  }) async {
    try {
      return await _dio.patch<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
        onSendProgress: onSendProgress,
        onReceiveProgress: onReceiveProgress,
      );
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    } catch (e) {
      throw ApiException(message: e.toString());
    }
  }

  /// DELETE request
  Future<Response<T>> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) async {
    try {
      return await _dio.delete<T>(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
        cancelToken: cancelToken,
      );
    } on DioException catch (e) {
      throw ApiException.fromDioException(e);
    } catch (e) {
      throw ApiException(message: e.toString());
    }
  }
}

