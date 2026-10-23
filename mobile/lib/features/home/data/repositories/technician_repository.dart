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
  List<TechnicianModel> _cachedTechnicians = [];
  List<TechnicianModel> get cachedTechnicians => _cachedTechnicians;

  /// Lấy danh sách kỹ thuật viên từ Supabase
  /// - Nếu [branchId] là mock id (bắt đầu bằng '2222'), bỏ qua để lấy KTV thực từ DB.
  /// - Nếu chi nhánh được chọn có KTV, trả về danh sách KTV của chi nhánh đó.
  /// - Nếu chi nhánh được chọn chưa có KTV (chi nhánh mới mở), tự động tải toàn bộ KTV active trong hệ thống.
  Future<List<TechnicianModel>> getTechnicians({String? branchId}) async {
    final bool hasValidBranch = branchId != null &&
        branchId.trim().isNotEmpty &&
        !branchId.startsWith('2222');

    try {
      String path = '${ApiEndpoints.technicians}?select=*,branches(name,address)&is_active=eq.true&order=rating_avg.desc';
      if (hasValidBranch) {
        path += '&branch_id=eq.$branchId';
      }

      final response = await _apiClient.dio.get(path);

      if (response.statusCode == 200 && response.data is List) {
        final list = (response.data as List)
            .map((item) => TechnicianModel.fromJson(item as Map<String, dynamic>))
            .toList();

        if (list.isNotEmpty) {
          debugPrint('>>> [TechnicianRepository] Loaded ${list.length} technicians from Supabase (branchId: $branchId).');
          _cachedTechnicians = list;
          return list;
        } else if (hasValidBranch) {
          // Chi nhánh này trong DB chưa có KTV (ví dụ Long Biên), query tất cả KTV active để khách chọn
          debugPrint('>>> [TechnicianRepository] Branch $branchId has 0 technicians. Fetching all active technicians.');
          const allPath = '${ApiEndpoints.technicians}?select=*,branches(name,address)&is_active=eq.true&order=rating_avg.desc';
          final allRes = await _apiClient.dio.get(allPath);
          if (allRes.statusCode == 200 && allRes.data is List) {
            final allList = (allRes.data as List)
                .map((item) => TechnicianModel.fromJson(item as Map<String, dynamic>))
                .toList();
            if (allList.isNotEmpty) {
              debugPrint('>>> [TechnicianRepository] Loaded ${allList.length} general technicians from Supabase.');
              _cachedTechnicians = allList;
              return allList;
            }
          }
        } else if (hasValidBranch) {
          // Chi nhánh này trong DB chưa có KTV (ví dụ Long Biên), query tất cả KTV active để khách chọn
          debugPrint('>>> [TechnicianRepository] Branch $branchId has 0 technicians. Fetching all active technicians.');
          const allPath = '${ApiEndpoints.technicians}?select=*,branches(name,address)&is_active=eq.true&order=rating_avg.desc';
          final allRes = await _apiClient.dio.get(allPath);
          if (allRes.statusCode == 200 && allRes.data is List) {
            final allList = (allRes.data as List)
                .map((item) => TechnicianModel.fromJson(item as Map<String, dynamic>))
                .toList();
            if (allList.isNotEmpty) {
              debugPrint('>>> [TechnicianRepository] Loaded ${allList.length} general technicians from Supabase.');
              _cachedTechnicians = allList;
              return allList;
            }
          }
        }
      }
    } catch (e) {
      debugPrint('>>> [TechnicianRepository] Error fetching technicians from Supabase: $e');
    }

    // Fallback an toàn nếu mất mạng
    if (_cachedTechnicians.isNotEmpty) {
      debugPrint('>>> [TechnicianRepository] Return ${_cachedTechnicians.length} cached technicians.');
      return _cachedTechnicians;
    }

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
          _cachedTechnicians = list;
          return list;
        }
      }
    } catch (e) {
      debugPrint('>>> [TechnicianRepository] Error fetching top technicians: $e');
    }

    if (_cachedTechnicians.isNotEmpty) {
      return _cachedTechnicians.take(limit).toList();
    }

    return MockHomeRepository.getTopTechnicians();
  }

  /// Lấy chi tiết kỹ thuật viên theo ID
  Future<TechnicianModel?> getTechnicianDetail(String id) async {
    try {
      final path = ApiEndpoints.technicianDetail(id);
      final response = await _apiClient.dio.get(path);
      if (response.statusCode == 200 && response.data is List && (response.data as List).isNotEmpty) {
        return TechnicianModel.fromJson((response.data as List).first as Map<String, dynamic>);
      }
    } catch (e) {
      debugPrint('>>> [TechnicianRepository] Error fetching technician detail: $e');
    }
    return null;
  }
}
