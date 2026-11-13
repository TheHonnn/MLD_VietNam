import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'supabase_data_service.dart';

/// Service quản lý toàn bộ các cấu hình động do Admin điều khiển từ xa
/// (Portal Contacts, Taxonomies, FAQs, Legal Policies)
/// Có cơ chế Offline-First: Lưu cache vào SharedPreferences để mở app là có ngay.
class PortalSettingsService {
  PortalSettingsService._internal();
  static final PortalSettingsService instance = PortalSettingsService._internal();

  final SupabaseDataService _supabase = SupabaseDataService();

  // Giá trị mặc định y khoa an toàn
  static const String defaultHotline = '096.7786.399';
  static const String defaultZaloOa = 'https://zalo.me/1424469774232439257?src=qr';
  static const String defaultMessenger = 'https://m.me/hebachhuyet.mldvietnam';
  static const String defaultFanpage = 'https://facebook.com/hebachhuyet.mldvietnam';
  static const String defaultTiktok = 'https://tiktok.com/@mldvietnam';
  static const String defaultWorkingHours = '09:00 – 20:00 hàng ngày';
  static const String defaultAddress =
      'Chi nhánh Quận 3, 123 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh';
  static const String defaultBadgeText = 'TƯ VẤN Y KHOA MLD';

  static const List<String> defaultAudiences = [
    'Tất cả đối tượng',
    'Người mới bắt đầu',
    'Đang làm nghề',
    'Y bác sĩ & Điều dưỡng',
    'Người chăm sóc gia đình',
  ];

  static const List<String> defaultNeeds = [
    'Tất cả nhu cầu',
    'Kiến thức nền tảng & Tự chăm sóc',
    'Tích hợp dịch vụ mới',
    'Mở cơ sở chăm sóc',
    'Chuẩn hóa kỹ thuật Vodder Châu Âu',
  ];

  // In-memory state
  String _hotlineSupport = defaultHotline;
  String _hotlineTraining = defaultHotline;
  String _zaloOaUrl = defaultZaloOa;
  String _messengerUrl = defaultMessenger;
  String _fanpageUrl = defaultFanpage;
  String _tiktokUrl = defaultTiktok;
  String _workingHours = defaultWorkingHours;
  String _headquartersAddress = defaultAddress;
  String _consultationBadgeText = defaultBadgeText;

  List<Map<String, dynamic>> _taxonomies = [];
  List<Map<String, dynamic>> _faqs = [];
  List<Map<String, dynamic>> _legalPolicies = [];

  bool _initialized = false;

  // Getters
  String get hotlineSupport => _hotlineSupport;
  String get hotlineTraining => _hotlineTraining;
  String get zaloOaUrl => _zaloOaUrl;
  String get messengerUrl => _messengerUrl;
  String get fanpageUrl => _fanpageUrl;
  String get tiktokUrl => _tiktokUrl;
  String get workingHours => _workingHours;
  String get headquartersAddress => _headquartersAddress;
  String get consultationBadgeText => _consultationBadgeText;

  List<Map<String, dynamic>> get taxonomies => List.unmodifiable(_taxonomies);
  List<Map<String, dynamic>> get faqs => List.unmodifiable(_faqs);
  List<Map<String, dynamic>> get legalPolicies => List.unmodifiable(_legalPolicies);

  /// Lấy danh sách tên Đối tượng lọc (có 'Tất cả đối tượng')
  List<String> get audienceFilterList {
    final list = <String>['Tất cả đối tượng'];
    for (final item in _taxonomies) {
      if (item['type'] == 'TARGET_AUDIENCE' && item['is_active'] == true) {
        final name = (item['name'] as String?)?.trim() ?? '';
        if (name.isNotEmpty && !list.contains(name)) {
          list.add(name);
        }
      }
    }
    return list.length > 1 ? list : defaultAudiences;
  }

  /// Lấy danh sách tên Nhu cầu lọc (có 'Tất cả nhu cầu')
  List<String> get needFilterList {
    final list = <String>['Tất cả nhu cầu'];
    for (final item in _taxonomies) {
      if (item['type'] == 'TARGET_NEED' && item['is_active'] == true) {
        final name = (item['name'] as String?)?.trim() ?? '';
        if (name.isNotEmpty && !list.contains(name)) {
          list.add(name);
        }
      }
    }
    return list.length > 1 ? list : defaultNeeds;
  }

  /// Lấy danh sách thẻ Đối tượng phục vụ Form đăng ký E05
  List<Map<String, dynamic>> get audienceCardsForEnrollment {
    final list = _taxonomies
        .where((x) => x['type'] == 'TARGET_AUDIENCE' && x['is_active'] == true)
        .toList();
    if (list.isNotEmpty) return list;

    return [
      {
        'code': 'BEGINNER',
        'name': 'Người mới bắt đầu',
        'description':
            'Chưa có kinh nghiệm, muốn học kiến thức nền tảng và tự chăm sóc cơ bản theo chuẩn Vodder.',
        'icon_name': 'school',
      },
      {
        'code': 'SPA_PRO',
        'name': 'Đang làm nghề',
        'description':
            'Kỹ thuật viên, chủ Spa, y bác sĩ muốn chuẩn hóa tay nghề và tích hợp liệu trình chuyên sâu.',
        'icon_name': 'spa',
      },
    ];
  }

  /// Khởi tạo dữ liệu từ Local Storage
  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;

    try {
      final prefs = await SharedPreferences.getInstance();

      // 1. Restore Contacts
      final cachedContactsRaw = prefs.getString('cached_portal_contacts');
      if (cachedContactsRaw != null && cachedContactsRaw.isNotEmpty) {
        final data = jsonDecode(cachedContactsRaw) as Map<String, dynamic>;
        _applyContactsData(data);
      }

      // 2. Restore Taxonomies
      final cachedTaxonomiesRaw = prefs.getString('cached_portal_taxonomies');
      if (cachedTaxonomiesRaw != null && cachedTaxonomiesRaw.isNotEmpty) {
        final list = jsonDecode(cachedTaxonomiesRaw) as List<dynamic>;
        _taxonomies = list.map((e) => Map<String, dynamic>.from(e)).toList();
      }

      // 3. Restore FAQs
      final cachedFaqsRaw = prefs.getString('cached_portal_faqs');
      if (cachedFaqsRaw != null && cachedFaqsRaw.isNotEmpty) {
        final list = jsonDecode(cachedFaqsRaw) as List<dynamic>;
        _faqs = list.map((e) => Map<String, dynamic>.from(e)).toList();
      }

      // 4. Restore Legal Policies
      final cachedPoliciesRaw = prefs.getString('cached_portal_policies');
      if (cachedPoliciesRaw != null && cachedPoliciesRaw.isNotEmpty) {
        final list = jsonDecode(cachedPoliciesRaw) as List<dynamic>;
        _legalPolicies = list.map((e) => Map<String, dynamic>.from(e)).toList();
      }
    } catch (e) {
      debugPrint('[PortalSettingsService] init error: $e');
    }

    // Tự động đồng bộ ngầm từ Supabase
    syncFromCloud();
  }

  void _applyContactsData(Map<String, dynamic> data) {
    if (data['hotline_support'] != null) _hotlineSupport = data['hotline_support'];
    if (data['hotline_training'] != null) _hotlineTraining = data['hotline_training'];
    if (data['zalo_oa_url'] != null) _zaloOaUrl = data['zalo_oa_url'];
    if (data['messenger_url'] != null) _messengerUrl = data['messenger_url'];
    if (data['fanpage_url'] != null) _fanpageUrl = data['fanpage_url'];
    if (data['tiktok_url'] != null) _tiktokUrl = data['tiktok_url'];
    if (data['working_hours'] != null) _workingHours = data['working_hours'];
    if (data['headquarters_address'] != null) _headquartersAddress = data['headquarters_address'];
    if (data['consultation_badge_text'] != null) {
      _consultationBadgeText = data['consultation_badge_text'];
    }
  }

  /// Đồng bộ từ Supabase Cloud và cập nhật Offline Cache
  Future<void> syncFromCloud() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      // Sync Contacts
      final cloudContacts = await _supabase.fetchPortalContacts();
      if (cloudContacts != null) {
        _applyContactsData(cloudContacts);
        await prefs.setString('cached_portal_contacts', jsonEncode(cloudContacts));
      }

      // Sync Taxonomies
      final cloudTaxonomies = await _supabase.fetchTaxonomies();
      if (cloudTaxonomies.isNotEmpty) {
        _taxonomies = cloudTaxonomies;
        await prefs.setString('cached_portal_taxonomies', jsonEncode(cloudTaxonomies));
      }

      // Sync FAQs
      final cloudFaqs = await _supabase.fetchFaqs();
      if (cloudFaqs.isNotEmpty) {
        _faqs = cloudFaqs;
        await prefs.setString('cached_portal_faqs', jsonEncode(cloudFaqs));
      }

      // Sync Legal Policies
      final cloudPolicies = await _supabase.fetchLegalPolicies();
      if (cloudPolicies.isNotEmpty) {
        _legalPolicies = cloudPolicies;
        await prefs.setString('cached_portal_policies', jsonEncode(cloudPolicies));
      }
    } catch (e) {
      debugPrint('[PortalSettingsService] syncFromCloud error: $e');
    }
  }

  /// Tìm nội dung văn bản pháp lý theo slug
  Map<String, dynamic>? getLegalPolicy(String slug) {
    try {
      return _legalPolicies.firstWhere((p) => p['slug'] == slug);
    } catch (_) {
      return null;
    }
  }
}
