import 'package:flutter/foundation.dart';
import '../../../../core/network/api_client.dart';
import '../models/home_product_model.dart';

/// Repository quản lý Sản phẩm hỗ trợ tại nhà (Home Products)
/// Kết nối trực tiếp bảng `public.home_products` trên Database Supabase
/// Đồng bộ 100% 2 chiều với Web Admin
class ProductRepository {
  ProductRepository._();
  static final ProductRepository instance = ProductRepository._();

  final ApiClient _apiClient = ApiClient.instance;

  /// Danh sách sản phẩm dự phòng chuẩn Y khoa Vodder khi thiết bị offline
  static const List<HomeProductModel> defaultFallbackProducts = [
    HomeProductModel(
      id: 'prod-001',
      name: 'Băng ép đa lớp MLD Pro Care',
      category: 'Băng ép y khoa',
      priceMin: 350000,
      priceMax: 500000,
      unit: 'Cuộn',
      details: [
        'Sợi cotton dệt đàn hồi cao, đạt chuẩn y khoa trị liệu phù bạch huyết.',
        'Độ co giãn ngắn (short-stretch) tạo áp lực làm việc cao và áp lực nghỉ thấp.',
      ],
      sortOrder: 1,
    ),
    HomeProductModel(
      id: 'prod-002',
      name: 'Kem dưỡng ẩm phục hồi da MLD Bio Skin',
      category: 'Kem dưỡng da y khoa',
      priceMin: 420000,
      priceMax: 420000,
      unit: 'Tuýp 200ml',
      details: [
        'Độ pH 5.5 cân bằng sinh học cho làn da nhạy cảm sau dẫn lưu.',
        'Không hương liệu, chống khô nứt nẻ và bảo vệ hàng rào biểu bì.',
      ],
      sortOrder: 2,
    ),
    HomeProductModel(
      id: 'prod-003',
      name: 'Vớ y khoa áp lực MLD Class 2',
      category: 'Tất vớ áp lực',
      priceMin: 850000,
      priceMax: 950000,
      unit: 'Đôi',
      details: [
        'Áp lực chuẩn 23-32 mmHg giúp duy trì kết quả dẫn lưu và ngăn ngừa ứ trệ dịch.',
        'Chất liệu thông thoáng, phù hợp khí hậu nhiệt đới Việt Nam.',
      ],
      sortOrder: 3,
    ),
  ];

  List<HomeProductModel> _cachedProducts = [];
  List<HomeProductModel> get cachedProducts => _cachedProducts;

  /// Lấy danh sách sản phẩm từ CSDL Supabase
  Future<List<HomeProductModel>> getProducts({String? category, bool forceRefresh = false}) async {
    if (_cachedProducts.isNotEmpty && !forceRefresh && category == null) {
      return _cachedProducts;
    }

    try {
      String query = '/rest/v1/home_products?select=*&order=sort_order.asc,name.asc';
      if (category != null && category.isNotEmpty && category != 'Tất cả' && category != 'Tất cả sản phẩm') {
        query += '&category=eq.$category';
      }

      final res = await _apiClient.dio.get(query);
      if (res.data is List) {
        final products = (res.data as List)
            .map((item) => HomeProductModel.fromJson(item as Map<String, dynamic>))
            .toList();

        if (category == null || category == 'Tất cả') {
          _cachedProducts = products;
        }
        return products;
      }
      return _cachedProducts.isNotEmpty ? _cachedProducts : List.of(defaultFallbackProducts);
    } catch (e) {
      debugPrint('[ProductRepository] getProducts error: $e. Fallback to defaultFallbackProducts.');
      if (_cachedProducts.isEmpty) {
        _cachedProducts = List.of(defaultFallbackProducts);
      }
      return _cachedProducts;
    }
  }

  /// Lấy danh mục sản phẩm duy nhất
  Future<List<String>> getCategories() async {
    final products = await getProducts();
    final categories = <String>{'Tất cả'};
    for (final p in products) {
      if (p.category.trim().isNotEmpty) {
        categories.add(p.category.trim());
      }
    }
    return categories.toList();
  }

  /// Admin: Thêm sản phẩm mới vào Supabase
  Future<bool> createProduct({
    required String name,
    required String category,
    required double priceMin,
    required double priceMax,
    required String unit,
    List<String> details = const [],
    int sortOrder = 100,
    String? imageUrl,
  }) async {
    try {
      final res = await _apiClient.dio.post(
        '/rest/v1/home_products',
        data: {
          'name': name,
          'category': category,
          'price_min': priceMin,
          'price_max': priceMax,
          'unit': unit,
          'details': details,
          'sort_order': sortOrder,
          if (imageUrl != null && imageUrl.isNotEmpty) 'image_url': imageUrl,
        },
      );
      if (res.statusCode == 201 || res.statusCode == 200) {
        await getProducts(forceRefresh: true);
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('[ProductRepository] createProduct error: $e');
      return false;
    }
  }

  /// Admin: Cập nhật sản phẩm
  Future<bool> updateProduct(String id, Map<String, dynamic> data) async {
    try {
      final res = await _apiClient.dio.patch(
        '/rest/v1/home_products?id=eq.$id',
        data: data,
      );
      if (res.statusCode == 200 || res.statusCode == 204) {
        await getProducts(forceRefresh: true);
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('[ProductRepository] updateProduct error: $e');
      return false;
    }
  }

  /// Admin: Xóa sản phẩm
  Future<bool> deleteProduct(String id) async {
    try {
      final res = await _apiClient.dio.delete(
        '/rest/v1/home_products?id=eq.$id',
      );
      if (res.statusCode == 200 || res.statusCode == 204) {
        await getProducts(forceRefresh: true);
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('[ProductRepository] deleteProduct error: $e');
      return false;
    }
  }
}
