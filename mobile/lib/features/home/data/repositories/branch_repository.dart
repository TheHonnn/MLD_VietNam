import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
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

  /// Global state notification for the actively selected branch
  final ValueNotifier<BranchModel?> activeBranchNotifier = ValueNotifier<BranchModel?>(null);

  /// Convenient getter for the currently active branch
  BranchModel? get activeBranch => activeBranchNotifier.value;

  /// Set the active branch across the entire app and persist in SharedPreferences
  Future<void> setActiveBranch(BranchModel branch) async {
    activeBranchNotifier.value = branch;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('active_branch_id', branch.id);
      await prefs.setString('active_branch_name', branch.name);
      debugPrint('>>> [BranchRepository] Saved active branch: ${branch.name} (${branch.id})');
    } catch (e) {
      debugPrint('>>> [BranchRepository] Error saving active branch to prefs: $e');
    }
  }

  /// Initialize BranchRepository: load branches and restore the active branch
  Future<void> init() async {
    final branches = await getBranches();
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedBranchId = prefs.getString('active_branch_id');
      if (savedBranchId != null && branches.isNotEmpty) {
        final found = branches.firstWhere(
          (b) => b.id == savedBranchId,
          orElse: () => branches.first,
        );
        activeBranchNotifier.value = found;
        return;
      }
    } catch (e) {
      debugPrint('>>> [BranchRepository] Error restoring active branch: $e');
    }

    if (branches.isNotEmpty && activeBranchNotifier.value == null) {
      activeBranchNotifier.value = branches.first;
    }
  }

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
          debugPrint('>>> [BranchRepository] Loaded ${list.length} branches from Supabase.');
          _cachedBranches = list;
          if (activeBranchNotifier.value == null) {
            activeBranchNotifier.value = list.first;
          }
          return list;
        }
      }
    } catch (e) {
      debugPrint('>>> [BranchRepository] Error fetching branches from Supabase: $e');
    }

    // Fallback an toàn nếu mất mạng
    if (_cachedBranches.isNotEmpty) {
      if (activeBranchNotifier.value == null) {
        activeBranchNotifier.value = _cachedBranches.first;
      }
      return _cachedBranches;
    }

    final mock = MockHomeRepository.getBranches();
    _cachedBranches = mock;
    if (activeBranchNotifier.value == null && mock.isNotEmpty) {
      activeBranchNotifier.value = mock.first;
    }
    return mock;
  }
}
