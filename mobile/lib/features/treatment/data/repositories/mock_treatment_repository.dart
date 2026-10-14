import '../models/treatment_models.dart';

class MockTreatmentRepository {
  static final MockTreatmentRepository _instance = MockTreatmentRepository._internal();
  factory MockTreatmentRepository() => _instance;

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

  MockTreatmentRepository._internal() {
    _initData();
  }

  void _initData() {
    // 1. D01 & D02: GÓI LIỆU TRÌNH
    _packages.addAll([
      const UserPackageModel(
        id: 'pkg-01',
        packageName: 'Gói Massage Thư Giãn 10 Buổi',
        description: '10 buổi massage thư giãn toàn thân · 60 phút/buổi',
        imageUrl: 'assets/images/gioithieu_1.png',
        totalSessions: 10,
        completedSessions: 4,
        status: PackageStatus.active,
        expiryDate: '31/12/2026 · Minh họa',
        specialistName: 'Trần Minh Phương',
        branchName: 'Chi nhánh mẫu 01 — Quận 3',
        price: 4000000,
        nextAppointmentText: 'Buổi 05 · Lịch hẹn sắp tới',
        nextAppointmentDate: '15/10/2026 · 09:00–10:00',
        nextAppointmentService: 'Massage thư giãn toàn thân',
        sessions: [
          TreatmentSessionModel(
            sessionNumber: 1,
            title: 'Buổi 01 · Hoàn thành',
            status: 'COMPLETED',
            date: '10/09/2026',
            specialistName: 'Trần Minh Phương',
            branchName: 'Chi nhánh mẫu 01 — Quận 3',
            note: 'Làm quen với liệu trình và chia sẻ mong muốn thư giãn.',
            postCareAdvice: 'Trao đổi với chuyên viên khi cần điều chỉnh trải nghiệm.',
          ),
          TreatmentSessionModel(
            sessionNumber: 2,
            title: 'Buổi 02 · Hoàn thành',
            status: 'COMPLETED',
            date: '20/09/2026',
            specialistName: 'Trần Minh Phương',
            branchName: 'Chi nhánh mẫu 01 — Quận 3',
            note: 'Chuyên viên trao đổi về mức lực và sự thoải mái trong buổi chăm sóc.',
            postCareAdvice: 'Giữ nhịp sinh hoạt và nghỉ ngơi phù hợp với bản thân.',
          ),
          TreatmentSessionModel(
            sessionNumber: 3,
            title: 'Buổi 03 · Hoàn thành',
            status: 'COMPLETED',
            date: '01/10/2026',
            specialistName: 'Trần Minh Phương',
            branchName: 'Chi nhánh mẫu 01 — Quận 3',
            note: 'Buổi chăm sóc diễn ra theo nhịp thư giãn đã lựa chọn.',
            postCareAdvice: 'Vận động nhẹ nhàng nếu cảm thấy thoải mái.',
          ),
          TreatmentSessionModel(
            sessionNumber: 4,
            title: 'Buổi 04 · Hoàn thành',
            status: 'COMPLETED',
            date: '08/10/2026',
            specialistName: 'Trần Minh Phương',
            branchName: 'Chi nhánh mẫu 01 — Quận 3',
            note: 'Khách hàng hoàn thành buổi chăm sóc theo lịch trình.',
            postCareAdvice: 'Dành thời gian nghỉ ngơi thoải mái sau buổi massage.',
          ),
        ],
      ),
      const UserPackageModel(
        id: 'pkg-02',
        packageName: 'Gói Chăm Sóc Da Chuyên Sâu',
        description: '8 buổi chăm sóc da chuyên sâu với dưỡng chất thảo mộc quý.',
        imageUrl: 'assets/images/gioithieu_2.png',
        totalSessions: 8,
        completedSessions: 3,
        status: PackageStatus.active,
        expiryDate: '31/12/2026 · Minh họa',
        specialistName: 'Nguyễn Thu Hà',
        branchName: 'Chi nhánh mẫu 01 — Quận 3',
        price: 3600000,
        nextAppointmentText: 'Buổi 04 · Lịch hẹn sắp tới',
        nextAppointmentDate: '18/10/2026 · 14:00–15:30',
        nextAppointmentService: 'Chăm sóc da chuyên sâu phục hồi',
        sessions: [
          TreatmentSessionModel(
            sessionNumber: 1,
            title: 'Buổi 01 · Hoàn thành',
            status: 'COMPLETED',
            date: '15/09/2026',
            specialistName: 'Nguyễn Thu Hà',
          ),
          TreatmentSessionModel(
            sessionNumber: 2,
            title: 'Buổi 02 · Hoàn thành',
            status: 'COMPLETED',
            date: '25/09/2026',
            specialistName: 'Nguyễn Thu Hà',
          ),
          TreatmentSessionModel(
            sessionNumber: 3,
            title: 'Buổi 03 · Hoàn thành',
            status: 'COMPLETED',
            date: '05/10/2026',
            specialistName: 'Nguyễn Thu Hà',
          ),
        ],
      ),
    ]);

    // D01: Gợi ý khám phá thêm
    _suggestedPackages.addAll([
      SuggestedPackageModel(
        id: 'sug-01',
        title: 'Gói Chăm Sóc Da Dịu Nhẹ',
        specialistName: 'Nguyễn Thu Hà',
        priceText: '650.000đ',
        description: 'Tại chi nhánh mẫu 01 — Quận 3. Gợi ý minh họa; chưa đăng ký.',
        imageUrl: 'assets/images/gioithieu_2.png',
      ),
      SuggestedPackageModel(
        id: 'sug-02',
        title: 'Gói Chăm Sóc Cơ Thể',
        specialistName: 'Lê Hoài An',
        priceText: '650.000đ',
        description: 'Chăm sóc cơ thể tại chi nhánh mẫu 01 — Quận 3. Gợi ý minh họa; chưa đăng ký.',
        imageUrl: 'assets/images/gioithieu_3.png',
      ),
    ]);

    // D03: Nhật ký chăm sóc
    _journalEntries.addAll([
      const CareJournalEntryModel(
        id: 'j-04',
        sessionNumber: 4,
        date: 'Ngày 08/10/2026',
        serviceTitle: 'Buổi 04 – Massage thư giãn toàn thân',
        specialistName: 'Trần Minh Phương',
        branchName: 'Chi nhánh mẫu 01 — Quận 3',
        sessionNote: 'Khách hàng hoàn thành buổi chăm sóc theo lịch trình.',
        postCareSuggestion: 'Dành thời gian nghỉ ngơi thoải mái sau buổi massage.',
      ),
      const CareJournalEntryModel(
        id: 'j-03',
        sessionNumber: 3,
        date: 'Ngày 01/10/2026',
        serviceTitle: 'Buổi 03 – Massage thư giãn toàn thân',
        specialistName: 'Trần Minh Phương',
        branchName: 'Chi nhánh mẫu 01 — Quận 3',
        sessionNote: 'Buổi chăm sóc diễn ra theo nhịp thư giãn đã lựa chọn.',
        postCareSuggestion: 'Vận động nhẹ nhàng nếu cảm thấy thoải mái.',
      ),
      const CareJournalEntryModel(
        id: 'j-02',
        sessionNumber: 2,
        date: 'Ngày 20/09/2026',
        serviceTitle: 'Buổi 02 – Massage thư giãn toàn thân',
        specialistName: 'Trần Minh Phương',
        branchName: 'Chi nhánh mẫu 01 — Quận 3',
        sessionNote: 'Chuyên viên trao đổi về mức lực và sự thoải mái trong buổi chăm sóc.',
        postCareSuggestion: 'Giữ nhịp sinh hoạt và nghỉ ngơi phù hợp với bản thân.',
      ),
      const CareJournalEntryModel(
        id: 'j-01',
        sessionNumber: 1,
        date: 'Ngày 10/09/2026',
        serviceTitle: 'Buổi 01 – Massage thư giãn toàn thân',
        specialistName: 'Trần Minh Phương',
        branchName: 'Chi nhánh mẫu 01 — Quận 3',
        sessionNote: 'Làm quen với liệu trình và chia sẻ mong muốn thư giãn.',
        postCareSuggestion: 'Trao đổi với chuyên viên khi cần điều chỉnh trải nghiệm.',
      ),
    ]);

    // D06: Bài viết hướng dẫn chăm sóc tại nhà
    _guidelineArticles.addAll([
      const HomeCareArticleModel(
        id: 'art-01',
        title: '5 thói quen chăm sóc da mỗi ngày',
        category: 'Chăm sóc da.',
        readTimeText: 'Bài viết · 5 phút',
        summary: 'Những bước chăm sóc đơn giản, nhẹ nhàng và đều đặn.',
        imageUrl: 'assets/images/gioithieu_2.png',
        authorText: 'Ban nội dung · Nội dung minh họa',
      ),
      const HomeCareArticleModel(
        id: 'art-02',
        title: 'Hướng dẫn thư giãn nhẹ nhàng tại nhà',
        category: 'Thư giãn.',
        readTimeText: 'Video · 6 phút',
        summary: 'Một khoảng nghỉ yên tĩnh và vận động theo sự thoải mái.',
        imageUrl: 'assets/images/gioithieu_1.png',
        authorText: 'Ban nội dung · Nội dung minh họa',
        isVideo: true,
      ),
      const HomeCareArticleModel(
        id: 'art-03',
        title: 'Những lưu ý sau buổi chăm sóc cơ thể',
        category: 'Chăm sóc cơ thể.',
        readTimeText: 'Bài viết · 4 phút',
        summary: 'Dành thời gian nghỉ ngơi và lắng nghe cảm giác của bạn.',
        imageUrl: 'assets/images/branch_hero_1.png',
        authorText: 'Ban nội dung · Nội dung minh họa',
      ),
    ]);

    // D07: Tin nhắn hỗ trợ
    _chatMessages.addAll([
      const ChatMessageModel(
        id: 'msg-1',
        text: 'Tôi muốn đặt lịch buổi tiếp theo của gói massage.',
        time: '09:42',
        isFromUser: true,
      ),
      const ChatMessageModel(
        id: 'msg-2',
        text: 'Xin chào! Anh/chị có thể chọn lịch hẹn phù hợp trong phần quản lý liệu trình hoặc nhắn cho chúng tôi.',
        time: '09:43',
        isFromUser: false,
      ),
    ]);

    // D08: Thông báo
    _notifications.addAll([
      TreatmentNotificationModel(
        id: 'notif-1',
        title: 'Bạn có lịch massage vào 09:00 ngày 15/10/2026.',
        timestamp: '08/10/2026 · 09:30 · Chưa đọc',
        category: NotificationCategory.appointments,
        iconType: 'calendar',
        isRead: false,
        dateGroup: 'Hôm nay · 08/10/2026',
      ),
      TreatmentNotificationModel(
        id: 'notif-2',
        title: 'Gói chăm sóc của bạn còn 6 buổi sử dụng.',
        timestamp: '08/10/2026 · 09:15 · Chưa đọc',
        category: NotificationCategory.treatments,
        iconType: 'leaf',
        isRead: false,
        dateGroup: 'Hôm nay · 08/10/2026',
      ),
      TreatmentNotificationModel(
        id: 'notif-3',
        title: 'Khám phá các chương trình chăm sóc mới.',
        timestamp: '07/10/2026 · 16:00',
        category: NotificationCategory.all,
        iconType: 'gift',
        isRead: true,
        dateGroup: 'Hôm qua · 07/10/2026',
      ),
      TreatmentNotificationModel(
        id: 'notif-4',
        title: 'Lớp đào tạo kỹ thuật spa sẽ diễn ra vào ngày 16/10/2026.',
        timestamp: '07/10/2026 · 10:00',
        category: NotificationCategory.academy,
        iconType: 'graduation',
        isRead: true,
        dateGroup: 'Hôm qua · 07/10/2026',
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
  ConsultationPreferenceModel get latestConsultation => _latestConsultation;
  ServiceReviewDataModel get latestReview => _latestReview;

  UserPackageModel get mainPackage => _packages.first;

  void toggleSuggestedFavorite(String id) {
    final idx = _suggestedPackages.indexWhere((p) => p.id == id);
    if (idx != -1) {
      _suggestedPackages[idx].isFavorite = !_suggestedPackages[idx].isFavorite;
    }
  }

  void addJournalNote(String note) {
    if (note.trim().isEmpty) return;
    _journalEntries.insert(
      0,
      CareJournalEntryModel(
        id: 'j-custom-${DateTime.now().millisecondsSinceEpoch}',
        sessionNumber: _journalEntries.length + 1,
        date: 'Ngày hôm nay',
        serviceTitle: 'Ghi chú tự chăm sóc tại nhà',
        specialistName: 'Nguyễn Minh Anh (Tự ghi nhận)',
        branchName: 'Chi nhánh mẫu 01 — Quận 3',
        sessionNote: note,
        postCareSuggestion: 'Tiếp tục duy trì thói quen nghỉ ngơi và sinh hoạt lành mạnh.',
      ),
    );
  }

  void saveConsultation(ConsultationPreferenceModel model) {
    _latestConsultation = model;
  }

  void saveReview(ServiceReviewDataModel model) {
    _latestReview = model;
  }

  void submitReviewData(ServiceReviewDataModel model) => saveReview(model);
  List<HomeCareArticleModel> getGuidelineArticles() => guidelineArticles;
  List<ChatMessageModel> getChatMessages() => chatMessages;
  List<TreatmentNotificationModel> getTreatmentNotifications() => notifications;

  void sendChatMessage(String text) {
    if (text.trim().isEmpty) return;
    _chatMessages.add(
      ChatMessageModel(
        id: 'msg-${DateTime.now().millisecondsSinceEpoch}',
        text: text,
        time: 'Vừa xong',
        isFromUser: true,
      ),
    );
  }

  void markAllNotificationsRead() {
    for (final n in _notifications) {
      n.isRead = true;
    }
  }

  void markNotificationRead(String id) {
    final n = _notifications.firstWhere((item) => item.id == id, orElse: () => _notifications.first);
    n.isRead = true;
  }
}
