import 'package:flutter/foundation.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../models/home_models.dart';
import 'mock_home_repository.dart';

/// Real Branch Repository fetching branches from Supabase REST API
/// With automatic resilient fallback to MockHomeRepository when offline.
class BranchRepository {
  BranchRepository._internal();
  static final BranchRepository instance = BranchRepository._internal();
  factory BranchRepository() => instance;

  final ApiClient _apiClient = ApiClient.instance;
  List<BranchModel> _cachedBranches = [];
  List<BranchModel> get cachedBranches => _cachedBranches;

  /// Lấy danh sách chi nhánh hoạt động từ Supabase Cloud
  Future<List<BranchModel>> getBranches() async {
    try {
      const path = '${ApiEndpoints.branches}?is_active=eq.true&order=created_at.asc';
      final response = await _apiClient.dio.get(path);

      if (response.statusCode == 200 && response.data is List) {
        final list = (response.data as List)
            .map((item) => BranchModel.fromJson(item as Map<String, dynamic>))
            .toList();

        if (list.isNotEmpty) {
          debugPrint('>>> [BranchRepository] Loaded \${list.length} branches from Supabase.');
          _cachedBranches = list;
          return list;
        }
      }
    } catch (e) {
      debugPrint('>>> [BranchRepository] Error fetching branches from Supabase: $e');
    }

    // Fallback an toàn nếu mất mạng
    if (_cachedBranches.isNotEmpty) return _cachedBranches;
    return MockHomeRepository.getBranches();
  }
}

