import 'package:flutter/foundation.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../models/home_models.dart';
import 'mock_home_repository.dart';

/// Real Technician Repository fetching data from Supabase REST API
/// With automatic resilient fallback to MockHomeRepository when offline.
class TechnicianRepository {
  TechnicianRepository._internal();
  static final TechnicianRepository instance = TechnicianRepository._internal();
  factory TechnicianRepository() => instance;

  final ApiClient _apiClient = ApiClient.instance;

  /// Lấy danh sách kỹ thuật viên từ Supabase
  Future<List<TechnicianModel>> getTechnicians({String? branchId}) async {
    try {
      String path = '${ApiEndpoints.technicians}?select=*,branches(name,address)&is_active=eq.true&order=rating_avg.desc';
      if (branchId != null && branchId.isNotEmpty) {
        path += '&branch_id=eq.$branchId';
      }

      final response = await _apiClient.dio.get(path);

      if (response.statusCode == 200 && response.data is List) {
        final list = (response.data as List)
            .map((item) => TechnicianModel.fromJson(item as Map<String, dynamic>))
            .toList();

        if (list.isNotEmpty) {
          debugPrint('>>> [TechnicianRepository] Loaded ${list.length} technicians from Supabase.');
          return list;
        }
      }
    } catch (e) {
      debugPrint('>>> [TechnicianRepository] Error fetching technicians from Supabase: $e');
    }

    // Fallback an toàn nếu mất mạng hoặc chưa cấu hình
    debugPrint('>>> [TechnicianRepository] Fallback to MockHomeRepository.');
    return MockHomeRepository.getTopTechnicians();
  }

  /// Lấy kỹ thuật viên tiêu biểu
  Future<List<TechnicianModel>> getTopTechnicians({int limit = 5}) async {
    try {
      final path = '${ApiEndpoints.technicians}?select=*,branches(name,address)&is_active=eq.true&order=rating_avg.desc&limit=$limit';
      final response = await _apiClient.dio.get(path);

      if (response.statusCode == 200 && response.data is List) {
        final list = (response.data as List)
            .map((item) => TechnicianModel.fromJson(item as Map<String, dynamic>))
            .toList();

        if (list.isNotEmpty) {
          return list;
        }
      }
    } catch (e) {
      debugPrint('>>> [TechnicianRepository] Error fetching top technicians: $e');
    }

    return MockHomeRepository.getTopTechnicians();
  }
}

