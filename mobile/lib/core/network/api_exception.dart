import 'package:dio/dio.dart';

/// Custom Exception class for handling Network and API errors across MLD Vietnam App
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic data;
  final Map<String, dynamic>? errors;

  const ApiException({
    required this.message,
    this.statusCode,
    this.data,
    this.errors,
  });

  /// Factory constructor to convert DioException into user-friendly ApiException
  factory ApiException.fromDioException(DioException dioException) {
    switch (dioException.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const ApiException(
          message: 'Kết nối máy chủ quá hạn. Vui lòng kiểm tra mạng và thử lại.',
          statusCode: 408,
        );

      case DioExceptionType.badResponse:
        final response = dioException.response;
        final statusCode = response?.statusCode;
        final responseData = response?.data;

        String? serverMessage;
        Map<String, dynamic>? fieldErrors;

        if (responseData is Map<String, dynamic>) {
          if (responseData['message'] is String && (responseData['message'] as String).isNotEmpty) {
            serverMessage = responseData['message'] as String;
          } else if (responseData['message'] is List && (responseData['message'] as List).isNotEmpty) {
            serverMessage = (responseData['message'] as List).first.toString();
          } else if (responseData['error'] is String && (responseData['error'] as String).isNotEmpty) {
            serverMessage = responseData['error'] as String;
          }

          if (responseData['errors'] is Map<String, dynamic>) {
            fieldErrors = responseData['errors'] as Map<String, dynamic>;
          }
        }

        switch (statusCode) {
          case 400:
            return ApiException(
              message: serverMessage ?? 'Yêu cầu không hợp lệ.',
              statusCode: 400,
              data: responseData,
              errors: fieldErrors,
            );
          case 401:
            return ApiException(
              message: serverMessage ?? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
              statusCode: 401,
              data: responseData,
            );
          case 403:
            return ApiException(
              message: serverMessage ?? 'Bạn không có quyền truy cập tính năng này.',
              statusCode: 403,
              data: responseData,
            );
          case 404:
            return ApiException(
              message: serverMessage ?? 'Không tìm thấy dữ liệu yêu cầu.',
              statusCode: 404,
              data: responseData,
            );
          case 422:
            return ApiException(
              message: serverMessage ?? 'Dữ liệu gửi lên không hợp lệ.',
              statusCode: 422,
              data: responseData,
              errors: fieldErrors,
            );
          case 500:
          case 502:
          case 503:
          case 504:
            return ApiException(
              message: serverMessage ?? 'Hệ thống máy chủ đang bận hoặc bảo trì. Vui lòng thử lại sau.',
              statusCode: statusCode,
              data: responseData,
            );
          default:
            return ApiException(
              message: serverMessage ?? 'Đã xảy ra lỗi khi kết nối máy chủ.',
              statusCode: statusCode,
              data: responseData,
              errors: fieldErrors,
            );
        }

      case DioExceptionType.cancel:
        return const ApiException(
          message: 'Yêu cầu đã bị hủy.',
          statusCode: null,
        );

      case DioExceptionType.connectionError:
        return const ApiException(
          message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối Internet.',
          statusCode: null,
        );

      case DioExceptionType.badCertificate:
        return const ApiException(
          message: 'Chứng chỉ bảo mật máy chủ không an toàn.',
          statusCode: null,
        );

      case DioExceptionType.unknown:
      default:
        return ApiException(
          message: dioException.message ?? 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.',
          statusCode: null,
        );
    }
  }

  @override
  String toString() {
    if (statusCode != null) {
      return 'ApiException [$statusCode]: $message';
    }
    return 'ApiException: $message';
  }
}
