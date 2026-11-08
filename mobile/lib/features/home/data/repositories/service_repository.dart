import 'package:flutter/foundation.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../models/home_models.dart';
import 'mock_home_repository.dart';

/// Real Service Repository fetching spa services from Supabase REST API
/// With automatic resilient fallback to MockHomeRepository when offline.
class ServiceRepository {
  /// Thuế suất VAT toàn hệ thống do Admin thiết lập (8%, 10% hoặc tùy chỉnh)
  double _systemVatRate = 0.0;
  double get systemVatRate => _systemVatRate;
  void updateAdminVatRate(double rate) {
    _systemVatRate = rate;
  }

  /// Dịch vụ dẫn lưu phù bạch huyết Vodder MLD cốt lõi do Admin thiết lập
  static const SpaServiceModel defaultCoreVodderService = SpaServiceModel(
    id: '235166f2-66c9-4231-bbe1-af91b48fc67c',
    name: 'Chăm sóc mở rộng (60\')',
    categoryName: '3 Chương Trình Chăm Sóc Hệ Bạch Huyết',
    shortDescription: 'Chăm sóc mở rộng 60 phút tăng cường phạm vi dẫn lưu nhiều vùng liên kết, tối ưu hóa hệ miễn dịch và tiêu sưng.',
    fullDescription: 'Chương trình chăm sóc mở rộng 60 phút bao quát phạm vi liên kết rộng hơn trên cơ thể. Giúp kích hoạt đồng bộ cả hệ bạch huyết sâu và nông theo kỹ thuật Vodder chuẩn quốc tế. Đã bao gồm thuế VAT 8%.',
    durationMinutes: 60,
    price: 900000,
    vatRate: 0.08,
    imageUrl: 'assets/images/service_luu_phu_bach_huyet.png',
    isFeatured: true,
  );

  /// Lấy dịch vụ cốt lõi do Admin thiết lập từ Supabase
  Future<SpaServiceModel> getCoreVodderService() async {
    final list = await getServices();
    try {
      return list.firstWhere(
        (s) => s.name.toLowerCase().contains('bạch huyết') ||
               s.name.toLowerCase().contains('vodder') ||
               s.name.toLowerCase().contains('mld'),
      );
    } catch (_) {
      return list.isNotEmpty ? list.first : defaultCoreVodderService;
    }
  }

  ServiceRepository._internal();
  static final ServiceRepository instance = ServiceRepository._internal();
  factory ServiceRepository() => instance;

  final ApiClient _apiClient = ApiClient.instance;
  List<SpaServiceModel> _cachedServices = [];
  List<SpaServiceModel> get cachedServices => _cachedServices;

  /// Lấy danh sách dịch vụ từ Supabase
  Future<List<SpaServiceModel>> getServices({String? categoryId, String? search}) async {
    try {
      String path = '${ApiEndpoints.services}?select=*,service_categories(name)&is_active=eq.true&order=created_at.asc';
      if (categoryId != null && categoryId.isNotEmpty) {
        path += '&category_id=eq.$categoryId';
      }
      if (search != null && search.trim().isNotEmpty) {
        path += '&name=ilike.*${Uri.encodeComponent(search.trim())}*';
      }

      final response = await _apiClient.dio.get(path);

      if (response.statusCode == 200 && response.data is List) {
        final list = (response.data as List)
            .map((item) => SpaServiceModel.fromJson(item as Map<String, dynamic>))
            .toList();

        if (list.isNotEmpty) {
          debugPrint('>>> [ServiceRepository] Loaded ${list.length} services from Supabase.');
          _cachedServices = list;
          return list;
        }
      }
    } catch (e) {
      debugPrint('>>> [ServiceRepository] Error fetching services from Supabase: $e');
    }

    // Fallback an toàn nếu mất mạng
    debugPrint('>>> [ServiceRepository] Fallback to MockHomeRepository.');
    _cachedServices = MockHomeRepository.getFeaturedServices();
    return _cachedServices;
  }

  /// Lấy các dịch vụ nổi bật (Featured Services)
  Future<List<SpaServiceModel>> getFeaturedServices() async {
    try {
      const path = '${ApiEndpoints.services}?select=*,service_categories(name)&is_active=eq.true&is_featured=eq.true';
      final response = await _apiClient.dio.get(path);

      if (response.statusCode == 200 && response.data is List) {
        final list = (response.data as List)
            .map((item) => SpaServiceModel.fromJson(item as Map<String, dynamic>))
            .toList();

        if (list.isNotEmpty) {
          return list;
        }
      }
    } catch (e) {
      debugPrint('>>> [ServiceRepository] Error fetching featured services: $e');
    }

    return MockHomeRepository.getFeaturedServices();
  }

  /// Lấy danh mục dịch vụ từ Supabase
  Future<List<String>> getCategories() async {
    try {
      const path = '${ApiEndpoints.serviceCategories}?is_active=eq.true&order=display_order.asc';
      final response = await _apiClient.dio.get(path);

      if (response.statusCode == 200 && response.data is List) {
        final categories = (response.data as List)
            .map((item) => (item as Map<String, dynamic>)['name']?.toString() ?? '')
            .where((name) => name.isNotEmpty)
            .toList();

        if (categories.isNotEmpty) {
          return ['Tất cả', ...categories];
        }
      }
    } catch (e) {
      debugPrint('>>> [ServiceRepository] Error fetching categories: $e');
    }

    return [
      'Tất cả',
      'Massage thư giãn',
      'Chăm sóc da',
      'Chăm sóc cơ thể',
      'Chăm sóc sức khỏe',
      'Gói liệu trình',
    ];
  }
}
