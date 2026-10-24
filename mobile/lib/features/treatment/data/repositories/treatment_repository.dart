import 'package:flutter/foundation.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../models/treatment_models.dart';

/// Central Treatment Repository connecting Mobile to NestJS Backend Gateway
/// (/api/v1/treatment/*) with automatic offline resilience.
class TreatmentRepository {
  TreatmentRepository._internal() {
    _initData();
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
  ConsultationPreferenceModel _latestConsultation = const ConsultationPreferenceModel(
    selectedGoals: ['Thư giãn cơ thể.', 'Giảm cảm giác căng thẳng.'],
  );
  ServiceReviewDataModel _latestReview = const ServiceReviewDataModel();

  void _initData() {
    _packages.addAll([
      const UserPackageModel(
        id: 'pkg-user-001',
        packageName: 'Liệu trình Trị liệu Cổ Vai Gáy Chuyên sâu (10 buổi)',
        description: 'Giải phóng co thắt cơ, khai thông kinh lạc và phục hồi sức sống tự nhiên.',
        imageUrl: 'assets/images/specialist_hero_1.png',
        totalSessions: 10,
        completedSessions: 4,
        status: PackageStatus.active,
        expiryDate: '31/12/2026',
        specialistName: 'Trần Minh Phương',
        branchName: 'Chi nhánh Quận 3',
        price: 3500000,
        sessions: [
          TreatmentSessionModel(
            sessionNumber: 1,
            title: 'Khai thông kinh mạch vùng vai',
            status: 'COMPLETED',
            date: '01/10/2026',
            note: 'Cơ thang bên phải co cứng mạnh, đã giải phóng sơ bộ.',
          ),
          TreatmentSessionModel(
            sessionNumber: 2,
            title: 'Đả thông kinh lạc & bấm huyệt Phong Trì',
            status: 'COMPLETED',
            date: '04/10/2026',
            note: 'Biên độ xoay cổ cải thiện 40%, giảm nhức đầu.',
          ),
          TreatmentSessionModel(
            sessionNumber: 3,
            title: 'Liệu pháp nhiệt ấm ngải cứu dưỡng sinh',
            status: 'COMPLETED',
            date: '08/10/2026',
            note: 'Kinh lạc lưu thông tốt, da ấm hồng hào.',
          ),
          TreatmentSessionModel(
            sessionNumber: 4,
            title: 'Cân bằng trục cổ và kéo giãn đốt sống',
            status: 'COMPLETED',
            date: '11/10/2026',
            note: 'Độ mềm cơ đạt 75%, khách không còn tê bì cánh tay.',
          ),
        ],
      ),
      const UserPackageModel(
        id: 'pkg-user-002',
        packageName: 'Gói Chăm Sóc Da Chuyên Sâu Tái Tạo (5 buổi)',
        description: 'Chăm sóc và phục hồi da tổn thương, làm dịu và cấp ẩm sâu.',
        imageUrl: 'assets/images/gioithieu_2.png',
        totalSessions: 5,
        completedSessions: 5,
        status: PackageStatus.completed,
        expiryDate: '01/08/2026',
        specialistName: 'Nguyễn Thu Hà',
        branchName: 'Chi nhánh Quận 3',
        price: 2800000,
        sessions: [],
      ),
      const UserPackageModel(
        id: 'pkg-user-003',
        packageName: 'Gói Thư Giãn Dưỡng Sinh Toàn Thân (3 buổi)',
        description: 'Gói trải nghiệm ngắn hạn massage dưỡng sinh phục hồi năng lượng.',
        imageUrl: 'assets/images/gioithieu_3.png',
        totalSessions: 3,
        completedSessions: 1,
        status: PackageStatus.expired,
        expiryDate: '15/06/2026',
        specialistName: 'Lê Hoài An',
        branchName: 'Chi nhánh mẫu 02 — Quận 1',
        price: 1500000,
        sessions: [],
      ),
    ]);

    _suggestedPackages.addAll([
      SuggestedPackageModel(
        id: 'sug-01',
        title: 'Gói Chăm Sóc Da Dịu Nhẹ',
        specialistName: 'Nguyễn Thu Hà',
        priceText: '650.000đ',
        description: 'Tại Chi nhánh Quận 3.',
        imageUrl: 'assets/images/gioithieu_2.png',
      ),
      SuggestedPackageModel(
        id: 'sug-02',
        title: 'Gói Chăm Sóc Cơ Thể',
        specialistName: 'Lê Hoài An',
        priceText: '650.000đ',
        description: 'Chăm sóc cơ thể tại Chi nhánh Quận 3.',
        imageUrl: 'assets/images/gioithieu_3.png',
      ),
    ]);

    _guidelineArticles.addAll([
      const HomeCareArticleModel(
        id: 'art-01',
        title: '5 thói quen chăm sóc da mỗi ngày',
        category: 'Chăm sóc da.',
        readTimeText: 'Bài viết · 5 phút',
        summary: 'Những bước chăm sóc đơn giản, nhẹ nhàng và đều đặn.',
        imageUrl: 'assets/images/gioithieu_2.png',
        authorText: 'Ban chuyên môn MLD',
      ),
      const HomeCareArticleModel(
        id: 'art-02',
        title: 'Hướng dẫn thư giãn nhẹ nhàng tại nhà',
        category: 'Thư giãn.',
        readTimeText: 'Video · 6 phút',
        summary: 'Một khoảng nghỉ yên tĩnh và vận động theo sự thoải mái.',
        imageUrl: 'assets/images/gioithieu_1.png',
        authorText: 'Ban chuyên môn MLD',
        isVideo: true,
      ),
      const HomeCareArticleModel(
        id: 'art-03',
        title: 'Những lưu ý sau buổi chăm sóc cơ thể',
        category: 'Chăm sóc cơ thể.',
        readTimeText: 'Bài viết · 4 phút',
        summary: 'Dành thời gian nghỉ ngơi và lắng nghe cảm giác của bạn.',
        imageUrl: 'assets/images/branch_hero_1.png',
        authorText: 'Ban chuyên môn MLD',
      ),
    ]);

    _chatMessages.addAll([
      const ChatMessageModel(
        id: 'msg-welcome',
        text: 'Xin chào quý khách! Trung tâm Chăm sóc & Trị liệu MLD hân hạnh được đồng hành cùng bạn. Bạn cần hỗ trợ gì hôm nay?',
        time: 'Hôm nay',
        isFromUser: false,
      ),
    ]);

    _notifications.addAll([
      TreatmentNotificationModel(
        id: 'notif-zalo-booking',
        title: '[Zalo OA] Xác nhận đặt lịch: Ca trị liệu MLD Giảm phù nề sau phẫu thuật lúc 14:00 ngày mai tại Chi nhánh Quận 3 đã được xác nhận. Vui lòng đến trước 10 phút.',
        timestamp: '10:30',
        category: NotificationCategory.appointments,
        iconType: 'calendar',
        isRead: false,
        dateGroup: 'Hôm nay',
      ),
      TreatmentNotificationModel(
        id: 'notif-zalo-package',
        title: '[Zalo OA] Thông báo liệu trình: Liệu trình \'Trị liệu Cổ Vai Gáy Chuyên sâu\' của bạn còn 6/10 buổi. Bấm để đặt buổi tiếp theo.',
        timestamp: '08:15',
        category: NotificationCategory.treatments,
        iconType: 'leaf',
        isRead: false,
        dateGroup: 'Hôm nay',
      ),
      TreatmentNotificationModel(
        id: 'notif-zalo-exam',
        title: '[Zalo OA] Lịch tái khám: Đã đến lịch kiểm tra phù bạch huyết định kỳ sau 7 ngày phẫu thuật. Vui lòng liên hệ cơ sở để được theo dõi tốt nhất.',
        timestamp: 'Hôm qua',
        category: NotificationCategory.appointments,
        iconType: 'calendar',
        isRead: true,
        dateGroup: 'Hôm qua',
      ),
      TreatmentNotificationModel(
        id: 'notif-zalo-academy',
        title: '[Zalo OA / Email] Đào tạo MLD: Bạn đã được cấp quyền truy cập khóa học \'Kỹ thuật Massage & Dẫn lưu MLD Chuyên nghiệp\'. Thời hạn học đến 31/12/2026.',
        timestamp: '2 ngày trước',
        category: NotificationCategory.academy,
        iconType: 'graduation',
        isRead: true,
        dateGroup: 'Trước đó',
      ),
      TreatmentNotificationModel(
        id: 'notif-welcome',
        title: 'Chào mừng bạn đến với MLD Việt Nam! Khám phá ngay các dịch vụ chăm sóc da & trị liệu chuyên sâu.',
        timestamp: '3 ngày trước',
        category: NotificationCategory.all,
        iconType: 'gift',
        isRead: true,
        dateGroup: 'Trước đó',
      ),
    ]);
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
              list.add(
                UserPackageModel(
                  id: item['id']?.toString() ?? 'pkg-user-001',
                  packageName: tp?['name']?.toString() ?? 'Liệu trình Trị liệu Chuyên sâu MLD',
                  description: tp?['description']?.toString() ?? 'Phác đồ trị liệu khai thông kinh lạc tiêu chuẩn cao cấp.',
                  imageUrl: tp?['image_url']?.toString() ?? 'assets/images/specialist_hero_1.png',
                  totalSessions: total,
                  completedSessions: completed,
                  status: PackageStatus.active,
                  expiryDate: item['expires_at']?.toString() ?? '31/12/2026',
                  specialistName: item['assigned_specialist']?.toString() ?? 'Trần Minh Phương',
                  branchName: item['branch_name']?.toString() ?? 'Chi nhánh Quận 3',
                  price: (tp?['price'] as num?)?.toDouble() ?? 3500000,
                  sessions: const [
                    TreatmentSessionModel(
                      sessionNumber: 1,
                      title: 'Khai thông kinh mạch vùng cổ vai',
                      status: 'COMPLETED',
                      date: '01/10/2026',
                      note: 'Giải phóng cơ co cứng sơ bộ.',
                    ),
                  ],
                ),
              );
            }
          }
          if (list.isNotEmpty) {
            _packages.clear();
            _packages.addAll(list);
            return _packages;
          }
        }
      }
    } catch (e) {
      debugPrint('>>> [TreatmentRepository] Error fetching packages: $e');
    }
    return _packages;
  }

  /// D03: Lấy dòng thời gian nhật ký chăm sóc sức khỏe
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
                  sessionNumber: (item['session_number'] as num?)?.toInt() ?? (_journalEntries.length + 1),
                  date: item['date']?.toString() ?? 'Hôm nay',
                  serviceTitle: item['service_name']?.toString() ?? 'Buổi chăm sóc trị liệu',
                  specialistName: item['technician_name']?.toString() ?? 'Kỹ thuật viên MLD',
                  branchName: item['branch_name']?.toString() ?? 'Chi nhánh Quận 3',
                  sessionNote: item['customer_note']?.toString() ?? item['therapist_note']?.toString() ?? '',
                  postCareSuggestion: item['home_advice']?.toString() ?? 'Uống đủ nước ấm và giữ ấm cơ thể.',
                ),
              );
            }
          }
          if (list.isNotEmpty) {
            _journalEntries.clear();
            _journalEntries.addAll(list);
            return _journalEntries;
          }
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

  /// D05: Gửi đánh giá dịch vụ
  Future<void> saveReview(ServiceReviewDataModel model) async {
    _latestReview = model;
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

      await _apiClient.dio.post(
        ApiEndpoints.treatmentReviews,
        data: payload,
      );
    } catch (e) {
      debugPrint('>>> [TreatmentRepository] Error submitting review: $e');
      rethrow;
    }
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
