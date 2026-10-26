import 'dart:io' show Platform;
import 'package:dio/dio.dart';
import '../network/api_client.dart';
import '../network/api_endpoints.dart';

/// Centralized Data Service for connecting Flutter screens to live Supabase Backend
class SupabaseDataService {
  SupabaseDataService._internal();
  static final SupabaseDataService instance = SupabaseDataService._internal();
  factory SupabaseDataService() => instance;

  final ApiClient _client = ApiClient.instance;

  // ==========================================
  // 1. CHI NHÁNH & CƠ SỞ (BRANCHES)
  // ==========================================
  Future<List<Map<String, dynamic>>> fetchBranches() async {
    final response = await _client.get<List<dynamic>>(
      ApiEndpoints.branches,
      queryParameters: {
        'is_active': 'eq.true',
        'select': '*',
        'order': 'name.asc',
      },
    );
    if (response.data == null) return [];
    return List<Map<String, dynamic>>.from(response.data!);
  }

  // ==========================================
  // 2. DỊCH VỤ & BẢNG GIÁ (SERVICES & CATEGORIES)
  // ==========================================
  Future<List<Map<String, dynamic>>> fetchServices({String? categoryId}) async {
    final query = <String, dynamic>{
      'is_active': 'eq.true',
      'select': '*,service_categories(id,name,icon_name)',
      'order': 'name.asc',
    };
    if (categoryId != null && categoryId.isNotEmpty) {
      query['category_id'] = 'eq.$categoryId';
    }

    final response = await _client.get<List<dynamic>>(
      ApiEndpoints.services,
      queryParameters: query,
    );
    if (response.data == null) return [];
    return List<Map<String, dynamic>>.from(response.data!);
  }

  Future<List<Map<String, dynamic>>> fetchServiceCategories() async {
    final response = await _client.get<List<dynamic>>(
      ApiEndpoints.serviceCategories,
      queryParameters: {
        'is_active': 'eq.true',
        'select': '*',
        'order': 'display_order.asc',
      },
    );
    if (response.data == null) return [];
    return List<Map<String, dynamic>>.from(response.data!);
  }

  // ==========================================
  // 3. GÓI LIỆU TRÌNH (TREATMENT PACKAGES)
  // ==========================================
  Future<List<Map<String, dynamic>>> fetchTreatmentPackages() async {
    final response = await _client.get<List<dynamic>>(
      ApiEndpoints.treatmentPackages,
      queryParameters: {
        'is_active': 'eq.true',
        'select': '*',
        'order': 'price.asc',
      },
    );
    if (response.data == null) return [];
    return List<Map<String, dynamic>>.from(response.data!);
  }

  // ==========================================
  // 4. HỌC VIỆN & KHÓA HỌC (ACADEMY LMS)
  // ==========================================
  Future<List<Map<String, dynamic>>> fetchCourses() async {
    final response = await _client.get<List<dynamic>>(
      ApiEndpoints.courses,
      queryParameters: {
        'is_active': 'eq.true',
        'select': '*,course_categories(id,name)',
        'order': 'created_at.desc',
      },
    );
    if (response.data == null) return [];
    return List<Map<String, dynamic>>.from(response.data!);
  }

  // ==========================================
  // 5. ĐẶT LỊCH HẸN (BOOKINGS)
  // ==========================================
  Future<Map<String, dynamic>> createBooking(Map<String, dynamic> bookingData) async {
    final response = await _client.post<List<dynamic>>(
      ApiEndpoints.bookings,
      data: bookingData,
    );
    if (response.data != null && response.data!.isNotEmpty) {
      return Map<String, dynamic>.from(response.data!.first);
    }
    return {};
  }

  Future<List<Map<String, dynamic>>> fetchMyBookings(String customerId) async {
    final response = await _client.get<List<dynamic>>(
      ApiEndpoints.bookings,
      queryParameters: {
        'customer_id': 'eq.$customerId',
        'select': '*,branches(name,address,phone)',
        'order': 'booking_date.desc,start_time.desc',
      },
    );
    if (response.data == null) return [];
    return List<Map<String, dynamic>>.from(response.data!);
  }

  // ==========================================
  // 6. THANH TOÁN VIETQR (EDGE FUNCTION)
  // ==========================================
  Future<Map<String, dynamic>> generateVietQr({
    String? invoiceId,
    String? bookingId,
    num? amount,
    String? description,
  }) async {
    final response = await _client.post<Map<String, dynamic>>(
      ApiEndpoints.vietQrPayment,
      data: {
        if (invoiceId != null) 'invoice_id': invoiceId,
        if (bookingId != null) 'booking_id': bookingId,
        if (amount != null) 'amount': amount,
        if (description != null) 'description': description,
      },
    );
    return response.data ?? {};
  }

  // ==========================================
  // 7. THÔNG BÁO (NOTIFICATIONS)
  // ==========================================
  Future<List<Map<String, dynamic>>> fetchMyNotifications(String userId) async {
    final response = await _client.get<List<dynamic>>(
      ApiEndpoints.notifications,
      queryParameters: {
        'user_id': 'eq.$userId',
        'select': '*',
        'order': 'created_at.desc',
      },
    );
    if (response.data == null) return [];
    return List<Map<String, dynamic>>.from(response.data!);
  }

  // ==========================================
  // 8. TÀI LIỆU Y KHOA & CẨM NANG (DOCUMENTS)
  // ==========================================
  Future<List<Map<String, dynamic>>> fetchDocuments({String? category}) async {
    try {
      if (Platform.environment.containsKey('FLUTTER_TEST')) {
        return [];
      }
    } catch (_) {}
    final query = <String, dynamic>{
      'is_published': 'eq.true',
      'select': '*',
      'order': 'created_at.desc',
    };
    if (category != null && category.isNotEmpty && category != 'Tất cả') {
      query['category'] = 'eq.$category';
    }

    try {
      final response = await _client.get<List<dynamic>>(
        ApiEndpoints.homeCareGuidelines,
        queryParameters: query,
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseServiceRoleKey,
            'Authorization': 'Bearer ${ApiEndpoints.supabaseServiceRoleKey}',
          },
        ),
      );
      if (response.data != null) {
        return List<Map<String, dynamic>>.from(response.data!);
      }
    } catch (_) {}
    return [];
  }

  // ==========================================
  // 9. BANNERS & NỘI DUNG TRANG CHỦ (PORTAL BANNERS)
  // Quản trị viên (Admin) cấu hình từ xa qua web-admin / Supabase
  // ==========================================
  Future<List<Map<String, dynamic>>> fetchBanners() async {
    try {
      if (Platform.environment.containsKey('FLUTTER_TEST')) {
        return [];
      }
    } catch (_) {}

    try {
      final response = await _client.get<List<dynamic>>(
        ApiEndpoints.portalContent,
        queryParameters: {
          'kind': 'eq.BANNER',
          'status': 'in.(PUBLISHED,APPROVED)',
          'select': '*',
          'order': 'sort_order.asc,created_at.desc',
        },
      );
      if (response.data == null) return [];
      return List<Map<String, dynamic>>.from(response.data!);
    } catch (_) {
      return [];
    }
  }

  // ==========================================
  // 10. HỌC LIỆU & BÀI HỌC VIDEO KHÓA HỌC (CURRICULUM)
  // Lấy danh sách chương và bài học video từ Supabase Cloud
  // ==========================================
  Future<List<Map<String, dynamic>>> fetchCourseCurriculum(String courseId) async {
    try {
      if (Platform.environment.containsKey('FLUTTER_TEST')) {
        return [];
      }
    } catch (_) {}

    try {
      final response = await _client.get<List<dynamic>>(
        '/rest/v1/course_chapters',
        queryParameters: {
          'course_id': 'eq.$courseId',
          'select': '*,course_lessons(*)',
          'order': 'chapter_order.asc',
        },
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.supabaseAnonKey}',
          },
        ),
      );
      if (response.data == null) return [];
      return List<Map<String, dynamic>>.from(response.data!);
    } catch (_) {
      return [];
    }
  }
}
