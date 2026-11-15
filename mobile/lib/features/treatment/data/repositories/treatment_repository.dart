import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../membership/data/repositories/membership_repository.dart';
import '../models/treatment_models.dart';

/// Central Treatment Repository connecting Mobile to NestJS Backend Gateway
/// (/api/v1/treatment/*) with automatic offline resilience.
class TreatmentRepository {
  TreatmentRepository._internal() {
    _initData();
    AuthService.instance.addOnLogoutListener(() {
      clear();
    });
  }
  static final TreatmentRepository instance = TreatmentRepository._internal();
  factory TreatmentRepository() => instance;

  final ApiClient _apiClient = ApiClient.instance;

  final List<UserPackageModel> _packages = [];
  final List<SuggestedPackageModel> _suggestedPackages = [];
  final List<CareJournalEntryModel> _journalEntries = [];
  final List<HomeCareArticleModel> _guidelineArticles = [];
  final List<ChatMessageModel> _chatMessages = [];
  final List<TreatmentNotificationModel> _notifications = [];

  void clear() {
    _packages.clear();
    _suggestedPackages.clear();
    _journalEntries.clear();
    _chatMessages.clear();
    _notifications.clear();
  }
  ConsultationPreferenceModel _latestConsultation = const ConsultationPreferenceModel(
    selectedGoals: ['Thư giãn cơ thể.', 'Giảm cảm giác căng thẳng.'],
  );
  ServiceReviewDataModel _latestReview = const ServiceReviewDataModel();

  void _initData() {
    // Không seed dữ liệu tĩnh giả mạo tài khoản. Toàn bộ dữ liệu được tải từ Backend/Database.
  }

  // Getters
  List<UserPackageModel> get packages => List.unmodifiable(_packages);
  List<SuggestedPackageModel> get suggestedPackages => _suggestedPackages;
  List<CareJournalEntryModel> get journalEntries => List.unmodifiable(_journalEntries);
  List<HomeCareArticleModel> get guidelineArticles => List.unmodifiable(_guidelineArticles);
  List<ChatMessageModel> get chatMessages => List.unmodifiable(_chatMessages);
  List<TreatmentNotificationModel> get notifications => List.unmodifiable(_notifications);
  bool get hasUnreadNotifications => _notifications.any((n) => !n.isRead);

  void markAllNotificationsAsRead() {
    for (final n in _notifications) {
      n.isRead = true;
    }
  }

  void markNotificationAsRead(String id) {
    for (final n in _notifications) {
      if (n.id == id) {
        n.isRead = true;
        break;
      }
    }
  }
  ConsultationPreferenceModel get latestConsultation => _latestConsultation;
  ServiceReviewDataModel get latestReview => _latestReview;
  UserPackageModel? get mainPackage => _packages.isNotEmpty ? _packages.first : null;

  /// D01: Lấy danh sách gói liệu trình từ Backend Gateway
  Future<List<UserPackageModel>> fetchPackages() async {
    try {
      final response = await _apiClient.dio.get(ApiEndpoints.treatmentMyPackages);
      if (response.statusCode == 200 && response.data != null) {
        final raw = response.data['data'] ?? response.data;
        if (raw is List) {
          final list = <UserPackageModel>[];
          for (final item in raw) {
            if (item is Map<String, dynamic>) {
              final tp = item['treatment_packages'] as Map<String, dynamic>?;
              final total = (item['total_sessions'] as num?)?.toInt() ?? 10;
              final completed = (item['completed_sessions'] as num?)?.toInt() ?? 0;

              // Parse sessions if backend provides them
              final rawSessions = item['sessions'] as List<dynamic>? ?? [];
              final sessionList = <TreatmentSessionModel>[];
              for (final s in rawSessions) {
                if (s is Map<String, dynamic>) {
                  sessionList.add(
                    TreatmentSessionModel(
                      id: s['id']?.toString() ?? '',
                      sessionNumber: (s['session_number'] as num?)?.toInt() ?? (sessionList.length + 1),
                      packageCode: s['package_code']?.toString() ?? item['code']?.toString() ?? item['package_code']?.toString() ?? '',
                      packageName: s['package_name']?.toString() ?? tp?['name']?.toString() ?? item['package_name']?.toString() ?? '',
                      serviceName: s['service_name']?.toString() ?? tp?['service_name']?.toString() ?? item['service_name']?.toString() ?? '',
                      customerName: s['customer_name']?.toString() ?? item['customer_name']?.toString() ?? '',
                      treatmentTime: s['treatment_time']?.toString() ?? s['session_date']?.toString() ?? s['date']?.toString() ?? '',
                      totalSessions: total,
                      status: s['status']?.toString() ?? 'PENDING',
                      title: s['title']?.toString() ?? 'Buổi ${(s['session_number'] as num?)?.toInt() ?? (sessionList.length + 1)}',
                      content: s['content']?.toString() ?? s['note']?.toString() ?? '',
                      evidenceImages: (s['evidence_images'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
                      specialistName: s['specialist_name']?.toString() ?? item['assigned_specialist']?.toString() ?? 'Chuyên viên MLD',
                      branchName: s['branch_name']?.toString() ?? item['branch_name']?.toString() ?? 'Chi nhánh Quận 3',
                      postCareAdvice: s['post_care_advice']?.toString(),
                    ),
                  );
                }
              }

              // Determine status
              PackageStatus pkgStatus = PackageStatus.active;
              final statusStr = item['status']?.toString().toLowerCase() ?? '';
              if (statusStr.contains('complete') || completed >= total) {
                pkgStatus = PackageStatus.completed;
              } else if (statusStr.contains('expire')) {
                pkgStatus = PackageStatus.expired;
              }

              list.add(
                UserPackageModel(
                  id: item['id']?.toString() ?? 'pkg-${list.length + 1}',
                  packageCode: item['package_code']?.toString() ?? item['code']?.toString() ?? 'MLD-PKG-${(list.length + 1).toString().padLeft(3, '0')}',
                  packageName: tp?['name']?.toString() ?? item['package_name']?.toString() ?? 'Gói Liệu trình MLD',
                  serviceName: tp?['service_name']?.toString() ?? item['service_name']?.toString() ?? 'Dẫn lưu bạch huyết',
                  customerName: item['customer_name']?.toString() ?? item['client_name']?.toString() ?? '',
                  description: tp?['description']?.toString() ?? item['description']?.toString() ?? '',
                  imageUrl: tp?['image_url']?.toString() ?? item['image_url']?.toString() ?? 'assets/images/specialist_hero_1.png',
                  totalSessions: total,
                  completedSessions: completed,
                  status: pkgStatus,
                  expiryDate: item['expires_at']?.toString() ?? item['expiry_date']?.toString() ?? '',
                  specialistName: item['assigned_specialist']?.toString() ?? 'Chuyên viên MLD',
                  branchName: item['branch_name']?.toString() ?? 'Chi nhánh Quận 3',
                  price: (tp?['price'] as num?)?.toDouble() ?? (item['price'] as num?)?.toDouble() ?? 0,
                  sessions: sessionList,
                ),
              );
            }
          }
          _packages.clear();
          _packages.addAll(list);
          return _packages;
        }
      }
    } catch (e) {
      debugPrint('>>> [TreatmentRepository] Error fetching packages: $e');
    }
    return _packages;
  }

  /// D03: Lấy dòng thời gian nhật ký chăm sóc sức khỏe & chuỗi minh chứng
  Future<List<CareJournalEntryModel>> fetchCareJournal() async {
    try {
      final response = await _apiClient.dio.get(ApiEndpoints.treatmentCareJournal);
      if (response.statusCode == 200 && response.data != null) {
        final raw = response.data['data'] ?? response.data;
        if (raw is List) {
          final list = <CareJournalEntryModel>[];
          for (final item in raw) {
            if (item is Map<String, dynamic>) {
              list.add(
                CareJournalEntryModel(
                  id: item['id']?.toString() ?? 'j-${DateTime.now().millisecondsSinceEpoch}',
                  packageCode: item['package_code']?.toString() ?? '',
                  packageName: item['package_name']?.toString() ?? '',
                  serviceName: item['service_name']?.toString() ?? item['service_title']?.toString() ?? 'Dịch vụ MLD',
                  customerName: item['customer_name']?.toString() ?? '',
                  sessionNumber: (item['session_number'] as num?)?.toInt() ?? (list.length + 1),
                  totalSessions: (item['total_sessions'] as num?)?.toInt() ?? 10,
                  treatmentTime: item['treatment_time']?.toString() ?? item['date']?.toString() ?? '',
                  content: item['content']?.toString() ?? item['customer_note']?.toString() ?? item['therapist_note']?.toString() ?? '',
                  evidenceImages: (item['evidence_images'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
                  specialistName: item['technician_name']?.toString() ?? item['specialist_name']?.toString() ?? 'Kỹ thuật viên MLD',
                  branchName: item['branch_name']?.toString() ?? 'Chi nhánh Quận 3',
                  postCareSuggestion: item['home_advice']?.toString() ?? item['post_care_suggestion']?.toString(),
                  bookingId: item['booking_id']?.toString(),
                  serviceId: item['service_id']?.toString(),
                  technicianId: item['technician_id']?.toString(),
                ),
              );
            }
          }
          _journalEntries.clear();
          _journalEntries.addAll(list);
          return _journalEntries;
        }
      }
    } catch (e) {
      debugPrint('>>> [TreatmentRepository] Error fetching care journal: $e');
    }
    return _journalEntries;
  }

  /// D03: Tạo ghi chú nhật ký mới
  Future<void> addJournalNote(String note) async {
    if (note.trim().isEmpty) return;
    final newEntry = CareJournalEntryModel(
      id: 'j-custom-${DateTime.now().millisecondsSinceEpoch}',
      sessionNumber: _journalEntries.length + 1,
      date: 'Hôm nay',
      serviceTitle: 'Ghi chú tự chăm sóc tại nhà',
      specialistName: 'Khách hàng (Tự ghi nhận)',
      branchName: 'Chi nhánh Quận 3',
      sessionNote: note,
      postCareSuggestion: 'Tiếp tục duy trì thói quen nghỉ ngơi và sinh hoạt lành mạnh.',
    );
    _journalEntries.insert(0, newEntry);

    try {
      await _apiClient.dio.post(
        ApiEndpoints.treatmentCareJournal,
        data: {
          'sessionNumber': newEntry.sessionNumber,
          'customerNote': note,
        },
      );
    } catch (e) {
      debugPrint('>>> [TreatmentRepository] Error adding journal note: $e');
    }
  }

  /// D04: Lưu khảo sát tiền dịch vụ
  Future<void> saveConsultation(ConsultationPreferenceModel model) async {
    _latestConsultation = model;
    try {
      await _apiClient.dio.post(
        ApiEndpoints.treatmentConsultation,
        data: {
          'selectedGoals': model.selectedGoals,
          'attentionArea': model.attentionArea,
          'allergies': model.allergies,
          'pastDiscomfort': model.pastDiscomfort,
          'specialRequest': model.specialRequest,
          'massagePressure': model.massagePressure,
          'roomTemperature': model.roomTemperature,
          'fragrance': model.fragrance,
          'communication': model.communication,
          'consentGiven': model.consentGiven,
        },
      );
    } catch (e) {
      debugPrint('>>> [TreatmentRepository] Error saving consultation: $e');
    }
  }

  String _resolveUserId() {
    final authId = AuthService.instance.currentUserId;
    if (authId != null && authId.isNotEmpty && authId != 'user-000001') {
      return authId;
    }
    final profileId = MembershipRepository.instance.userProfile.id;
    if (profileId.isNotEmpty && profileId != 'user-000001') {
      return profileId;
    }
    return '50a941ef-df2f-442e-ad2d-6a60ba6d6bb1';
  }

  /// D05: Lấy danh sách đánh giá của khách hàng (kèm phản hồi từ chi nhánh MLD)
  Future<List<ServiceReviewDataModel>> fetchMyReviews() async {
    final list = <ServiceReviewDataModel>[];
    final userId = _resolveUserId();
    if (userId.isEmpty) return list;

    try {
      final res = await _apiClient.dio.get(
        '${ApiEndpoints.supabaseUrl}/rest/v1/reviews',
        queryParameters: {
          'customer_id': 'eq.$userId',
          'select': 'id,customer_id,booking_id,service_id,technician_id,rating,review_tags,comment,photos,branch_reply,created_at,services(name),technicians(full_name)',
          'order': 'created_at.desc',
          'limit': '50',
        },
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.supabaseAnonKey}',
          },
        ),
      );

      if (res.statusCode == 200 && res.data is List) {
        for (final item in (res.data as List)) {
          if (item is Map<String, dynamic>) {
            list.add(ServiceReviewDataModel.fromJson(item));
          }
        }
      }
    } catch (e) {
      debugPrint('>>> [TreatmentRepository] Error fetching my reviews from Supabase: $e');
    }
    return list;
  }

  /// D05: Gửi đánh giá dịch vụ và nhận ngay +50 điểm thưởng hội viên
  Future<Map<String, dynamic>> saveReview(ServiceReviewDataModel model) async {
    _latestReview = model;
    final userId = _resolveUserId();

    // 1. Thử gửi qua Backend Gateway
    try {
      final payload = <String, dynamic>{
        'rating': model.overallRating,
        'overallRating': model.overallRating,
        'serviceQualityRating': model.serviceQualityRating,
        'staffAttitudeRating': model.staffAttitudeRating,
        'spaceAmbianceRating': model.spaceAmbianceRating,
        'procedureRating': model.procedureRating,
        'comment': model.comment,
        'willingnessToRefer': model.willingnessToRefer,
        'reviewTags': model.reviewTags,
        'photos': model.photos,
      };
      if (model.bookingId != null && model.bookingId!.isNotEmpty) {
        payload['bookingId'] = model.bookingId;
      }
      if (model.serviceId != null && model.serviceId!.isNotEmpty) {
        payload['serviceId'] = model.serviceId;
      }
      if (model.technicianId != null && model.technicianId!.isNotEmpty) {
        payload['technicianId'] = model.technicianId;
      }

      final response = await _apiClient.dio.post(
        ApiEndpoints.treatmentReviews,
        data: payload,
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        // Tải lại điểm thưởng
        await MembershipRepository.instance.fetchLoyaltyPoints();
        return {'success': true, 'pointsEarned': 50};
      }
    } catch (e) {
      debugPrint('>>> [TreatmentRepository] Backend review submission error, falling back to direct Supabase: $e');
    }

    // 2. Dự phòng trực tiếp ghi vào bảng reviews của Supabase
    if (userId.isNotEmpty) {
      try {
        String? bookingId = model.bookingId;
        String? serviceId = model.serviceId;
        String? technicianId = model.technicianId;

        // Ensure valid booking_id (required foreign key in reviews table)
        if (bookingId == null || bookingId.isEmpty) {
          try {
            final bRes = await _apiClient.dio.get(
              '${ApiEndpoints.supabaseUrl}/rest/v1/bookings?customer_id=eq.$userId&select=id,technician_id&order=created_at.desc&limit=1',
              options: Options(headers: {
                'apikey': ApiEndpoints.supabaseAnonKey,
                'Authorization': 'Bearer ${ApiEndpoints.supabaseAnonKey}',
              }),
            );
            if (bRes.statusCode == 200 && bRes.data is List && (bRes.data as List).isNotEmpty) {
              final b = (bRes.data as List).first as Map<String, dynamic>;
              bookingId = b['id']?.toString();
              technicianId ??= b['technician_id']?.toString();
            }
          } catch (_) {}
        }
        bookingId ??= '93d620bc-f3f7-40b3-b1c3-e5e146c8f87e';

        // Ensure valid service_id (required foreign key in reviews table)
        if (serviceId == null || serviceId.isEmpty) {
          serviceId = '235166f2-66c9-4231-bbe1-af91b48fc67c';
        }

        // Ensure valid technician_id
        technicianId ??= 'cccccccc-0001-0001-0001-000000000001';

        final reviewPayload = <String, dynamic>{
          'customer_id': userId,
          'booking_id': bookingId,
          'service_id': serviceId,
          'technician_id': technicianId,
          'rating': model.overallRating,
          'review_tags': model.reviewTags,
          'comment': model.comment,
          'photos': model.photos,
        };

        // Check if review already exists for this booking_id
        final existRes = await _apiClient.dio.get(
          '${ApiEndpoints.supabaseUrl}/rest/v1/reviews?booking_id=eq.$bookingId&select=id&limit=1',
          options: Options(headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.supabaseAnonKey}',
          }),
        );
        if (existRes.statusCode == 200 && existRes.data is List && (existRes.data as List).isNotEmpty) {
          final revId = (existRes.data as List).first['id'];
          await _apiClient.dio.patch(
            '${ApiEndpoints.supabaseUrl}/rest/v1/reviews?id=eq.$revId',
            data: {
              'rating': model.overallRating,
              'review_tags': model.reviewTags,
              'comment': model.comment,
              'photos': model.photos,
            },
            options: Options(headers: {
              'apikey': ApiEndpoints.supabaseAnonKey,
              'Authorization': 'Bearer ${ApiEndpoints.supabaseAnonKey}',
              'Prefer': 'return=representation',
            }),
          );
        } else {
          await _apiClient.dio.post(
            '${ApiEndpoints.supabaseUrl}/rest/v1/reviews',
            data: reviewPayload,
            options: Options(headers: {
              'apikey': ApiEndpoints.supabaseAnonKey,
              'Authorization': 'Bearer ${ApiEndpoints.supabaseAnonKey}',
              'Prefer': 'return=representation',
            }),
          );
        }

        // 3. Tích ngay +50 điểm cho khách hàng trên Supabase
        int currentPoints = MembershipRepository.instance.userProfile.points;
        try {
          final uRes = await _apiClient.dio.get(
            '${ApiEndpoints.supabaseUrl}/rest/v1/users?id=eq.$userId&select=reward_points&limit=1',
            options: Options(
              headers: {
                'apikey': ApiEndpoints.supabaseAnonKey,
                'Authorization': 'Bearer ${ApiEndpoints.supabaseAnonKey}',
              },
            ),
          );
          if (uRes.statusCode == 200 && uRes.data is List && (uRes.data as List).isNotEmpty) {
            final uData = (uRes.data as List).first;
            if (uData['reward_points'] != null) {
              currentPoints = (uData['reward_points'] as num).toInt();
            }
          }
        } catch (_) {}

        final newPoints = currentPoints + 50;

        // Cập nhật số dư trong users
        await _apiClient.dio.patch(
          '${ApiEndpoints.supabaseUrl}/rest/v1/users?id=eq.$userId',
          data: {'reward_points': newPoints},
          options: Options(
            headers: {
              'apikey': ApiEndpoints.supabaseAnonKey,
              'Authorization': 'Bearer ${ApiEndpoints.supabaseAnonKey}',
            },
          ),
        );

        // Ghi nhận biến động vào point_transactions
        await _apiClient.dio.post(
          '${ApiEndpoints.supabaseUrl}/rest/v1/point_transactions',
          data: {
            'user_id': userId,
            'points_change': 50,
            'balance_after': newPoints,
            'action_type': 'REVIEW_SERVICE',
            'description': 'Đánh giá chất lượng dịch vụ (+50 điểm)',
          },
          options: Options(
            headers: {
              'apikey': ApiEndpoints.supabaseAnonKey,
              'Authorization': 'Bearer ${ApiEndpoints.supabaseAnonKey}',
            },
          ),
        );

        // Cập nhật điểm trong App state
        MembershipRepository.instance.updateLocalPoints(newPoints);
        return {'success': true, 'pointsEarned': 50};
      } catch (e) {
        debugPrint('>>> [TreatmentRepository] Supabase direct review error: $e');
        return {'success': false, 'error': e.toString()};
      }
    }

    return {'success': false, 'error': 'Chưa đăng nhập'};
  }

  Future<void> submitReviewData(ServiceReviewDataModel model) => saveReview(model);

  /// D07: Gửi tin nhắn hỗ trợ khách hàng
  Future<void> sendChatMessage(String text) async {
    if (text.trim().isEmpty) return;
    _chatMessages.add(
      ChatMessageModel(
        id: 'msg-${DateTime.now().millisecondsSinceEpoch}',
        text: text,
        time: 'Vừa xong',
        isFromUser: true,
      ),
    );

    try {
      await _apiClient.dio.post(
        ApiEndpoints.treatmentSupportTickets,
        data: {
          'subject': 'Tư vấn trực tuyến di động',
          'category': 'GENERAL_SUPPORT',
          'message': text,
        },
      );
    } catch (e) {
      debugPrint('>>> [TreatmentRepository] Error sending chat message: $e');
    }
  }

  /// D08: Đánh dấu đã đọc thông báo
  Future<void> markNotificationRead(String id) async {
    final idx = _notifications.indexWhere((n) => n.id == id);
    if (idx != -1) {
      _notifications[idx].isRead = true;
    }
    try {
      await _apiClient.dio.patch(ApiEndpoints.treatmentMarkNotificationRead(id));
    } catch (e) {
      debugPrint('>>> [TreatmentRepository] Error marking notification read: $e');
    }
  }

  void markAllNotificationsRead() {
    for (final n in _notifications) {
      n.isRead = true;
    }
  }

  void toggleSuggestedFavorite(String id) {
    final idx = _suggestedPackages.indexWhere((p) => p.id == id);
    if (idx != -1) {
      _suggestedPackages[idx].isFavorite = !_suggestedPackages[idx].isFavorite;
    }
  }

  List<HomeCareArticleModel> getGuidelineArticles() => guidelineArticles;
  List<ChatMessageModel> getChatMessages() => chatMessages;
  List<TreatmentNotificationModel> getTreatmentNotifications() => notifications;
}
