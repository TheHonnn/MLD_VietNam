// Mô hình dữ liệu Phân hệ Group D (Treatment & Customer Care)
// Chuẩn 100% Hệ thống Y khoa MLD Việt Nam & Design System (#2860EB)

enum PackageStatus { active, completed, expired }

/// Mô hình một buổi trong phác đồ điều trị / chi tiết từng buổi (D02)
class TreatmentSessionModel {
  final String id;
  final int sessionNumber; // Buổi số mấy (Buổi 1, Buổi 2...)
  final String packageCode; // Mã liệu trình (VD: MLD-PKG-001)
  final String packageName; // Tên liệu trình
  final String serviceName; // Tên dịch vụ
  final String customerName; // Tên khách hàng
  final String treatmentTime; // Giờ điều trị / Ngày giờ điều trị (VD: 09:00 - 10:30 · 15/10/2026)
  final int totalSessions; // Tổng số buổi cần điều trị
  final String status; // 'COMPLETED' (Đã thực hiện), 'IN_PROGRESS' (Đang thực hiện), 'PENDING' (Đang chờ), 'CANCELLED' (Đã hủy)
  final String title; // Tiêu đề buổi
  final String content; // Nội dung buổi điều trị
  final List<String> evidenceImages; // Danh sách hình ảnh minh chứng kết quả/quá trình điều trị
  final String specialistName; // Chuyên viên / Bác sĩ phụ trách
  final String branchName; // Chi nhánh thực hiện
  final String? postCareAdvice; // Lời khuyên chăm sóc sau buổi

  const TreatmentSessionModel({
    this.id = '',
    required this.sessionNumber,
    this.packageCode = '',
    this.packageName = '',
    this.serviceName = '',
    this.customerName = '',
    this.treatmentTime = '',
    this.totalSessions = 1,
    this.status = 'PENDING',
    required this.title,
    this.content = '',
    this.evidenceImages = const [],
    this.specialistName = 'Chuyên viên MLD',
    this.branchName = 'Chi nhánh Quận 3',
    this.postCareAdvice,
  });

  bool get isCompleted => status == 'COMPLETED' || status == 'Đã thực hiện';
  bool get isInProgress => status == 'IN_PROGRESS' || status == 'Đang điều trị';

  // Getter hỗ trợ tương thích ngược
  String get date => treatmentTime;
  String? get note => content;
}

/// Mô hình Gói liệu trình của người dùng (D01 & D02)
class UserPackageModel {
  final String id;
  final String packageCode; // Mã liệu trình (VD: MLD-PKG-001)
  final String packageName; // Tên liệu trình
  final String serviceName; // Tên dịch vụ
  final String customerName; // Tên khách hàng
  final String description; // Mô tả liệu trình
  final String imageUrl; // Ảnh minh họa
  final int totalSessions; // Tổng số buổi cần điều trị
  final int completedSessions; // Số buổi đã thực hiện
  final PackageStatus status; // Trạng thái gói
  final String expiryDate; // Hạn sử dụng
  final String specialistName; // Chuyên viên phụ trách
  final String branchName; // Chi nhánh
  final double price; // Giá gói
  final String nextAppointmentText;
  final String nextAppointmentDate;
  final String nextAppointmentService;
  final List<TreatmentSessionModel> sessions; // Danh sách các buổi

  const UserPackageModel({
    required this.id,
    this.packageCode = '',
    required this.packageName,
    this.serviceName = '',
    this.customerName = '',
    this.description = '',
    this.imageUrl = 'assets/images/specialist_hero_1.png',
    required this.totalSessions,
    required this.completedSessions,
    required this.status,
    required this.expiryDate,
    required this.specialistName,
    required this.branchName,
    required this.price,
    this.nextAppointmentText = '',
    this.nextAppointmentDate = '',
    this.nextAppointmentService = '',
    this.sessions = const [],
  });

  int get remainingSessions => (totalSessions - completedSessions).clamp(0, totalSessions);
  double get progressPercent => totalSessions > 0 ? (completedSessions / totalSessions).clamp(0.0, 1.0) : 0.0;
  bool get isActive => status == PackageStatus.active;
}

/// Gợi ý gói chăm sóc (D01 Gợi ý)
class SuggestedPackageModel {
  final String id;
  final String title;
  final String specialistName;
  final String priceText;
  final String description;
  final String imageUrl;
  bool isFavorite;

  SuggestedPackageModel({
    required this.id,
    required this.title,
    required this.specialistName,
    required this.priceText,
    required this.description,
    required this.imageUrl,
    this.isFavorite = false,
  });
}

/// Mô hình mục Nhật ký chăm sóc & Xâu chuỗi minh chứng tiến trình (D03 CareJournal)
class CareJournalEntryModel {
  final String id;
  final String packageCode; // Mã liệu trình
  final String packageName; // Tên liệu trình
  final String serviceName; // Tên dịch vụ
  final String customerName; // Tên khách hàng
  final int sessionNumber; // Buổi số mấy (Buổi 1, Buổi 2...)
  final int totalSessions; // Tổng số buổi cần điều trị
  final String treatmentTime; // Giờ điều trị / Ngày điều trị
  final String content; // Nội dung buổi đó
  final List<String> evidenceImages; // Hình ảnh minh chứng buổi đó
  final String specialistName; // Chuyên viên thực hiện
  final String branchName; // Chi nhánh
  final String? postCareSuggestion; // Lời khuyên chăm sóc tại nhà
  final String? bookingId;
  final String? serviceId;
  final String? technicianId;

  const CareJournalEntryModel({
    required this.id,
    this.packageCode = '',
    this.packageName = '',
    String? serviceName,
    this.customerName = '',
    required this.sessionNumber,
    this.totalSessions = 1,
    String? treatmentTime,
    String? content,
    this.evidenceImages = const [],
    this.specialistName = 'Kỹ thuật viên MLD',
    this.branchName = 'Chi nhánh Quận 3',
    this.postCareSuggestion,
    this.bookingId,
    this.serviceId,
    this.technicianId,
    String? date,
    String? serviceTitle,
    String? sessionNote,
  })  : serviceName = serviceName ?? serviceTitle ?? '',
        treatmentTime = treatmentTime ?? date ?? '',
        content = content ?? sessionNote ?? '';

  // Getter tương thích ngược cho các màn hình hiện tại
  String get date => treatmentTime;
  String get serviceTitle => serviceName;
  String get sessionNote => content;
}

/// Mô hình Khảo sát tiền dịch vụ (D04 PreServiceConsultation)
class ConsultationPreferenceModel {
  final List<String> selectedGoals;
  final String attentionArea;
  final String allergies;
  final String pastDiscomfort;
  final String specialRequest;
  final String massagePressure; // 'Nhẹ', 'Vừa'
  final String roomTemperature; // 'Ấm vừa', 'Mát nhẹ'
  final String fragrance; // 'Không hương', 'Hương nhẹ'
  final String communication; // 'Khi cần thiết', 'Trò chuyện nhẹ'
  final bool consentGiven;

  const ConsultationPreferenceModel({
    required this.selectedGoals,
    this.attentionArea = '',
    this.allergies = '',
    this.pastDiscomfort = '',
    this.specialRequest = '',
    this.massagePressure = 'Nhẹ',
    this.roomTemperature = 'Ấm vừa',
    this.fragrance = 'Không hương',
    this.communication = 'Khi cần thiết',
    this.consentGiven = true,
  });
}

/// Mô hình Đánh giá dịch vụ (D05 ServiceReview)
class ServiceReviewDataModel {
  final int overallRating; // 1 - 5
  final int serviceQualityRating; // 1 - 5
  final int staffAttitudeRating; // 1 - 5
  final int spaceAmbianceRating; // 1 - 5
  final int procedureRating; // 1 - 5
  final String comment;
  final String willingnessToRefer; // 'Có', 'Có thể', 'Chưa'
  final String? bookingId;
  final String? serviceId;
  final String? technicianId;

  const ServiceReviewDataModel({
    this.overallRating = 5,
    this.serviceQualityRating = 5,
    this.staffAttitudeRating = 5,
    this.spaceAmbianceRating = 4,
    this.procedureRating = 5,
    this.comment = 'Chuyên viên chu đáo, mức lực vừa phải và không gian yên tĩnh. Tôi rất hài lòng.',
    this.willingnessToRefer = 'Có',
    this.bookingId,
    this.serviceId,
    this.technicianId,
  });
}

/// Mô hình Hướng dẫn chăm sóc tại nhà (D06 HomeCareGuidelines)
class HomeCareArticleModel {
  final String id;
  final String title;
  final String category;
  final String readTimeText;
  final String summary;
  final String imageUrl;
  final String authorText;
  final bool isVideo;

  const HomeCareArticleModel({
    required this.id,
    required this.title,
    required this.category,
    required this.readTimeText,
    required this.summary,
    required this.imageUrl,
    this.authorText = 'Ban chuyên môn MLD',
    this.isVideo = false,
  });
}

/// Tin nhắn hỗ trợ khách hàng (D07 CustomerSupport)
class ChatMessageModel {
  final String id;
  final String text;
  final String time;
  final bool isFromUser;

  const ChatMessageModel({
    required this.id,
    required this.text,
    required this.time,
    required this.isFromUser,
  });
}

/// Mô hình Thông báo (D08 Notifications)
enum NotificationCategory { all, appointments, treatments, academy }

class TreatmentNotificationModel {
  final String id;
  final String title;
  final String timestamp;
  final NotificationCategory category;
  final String iconType; // 'calendar', 'leaf', 'gift', 'graduation'
  bool isRead;
  final String dateGroup; // 'Hôm nay · 08/10/2026', 'Hôm qua · 07/10/2026'

  TreatmentNotificationModel({
    required this.id,
    required this.title,
    required this.timestamp,
    required this.category,
    required this.iconType,
    required this.isRead,
    required this.dateGroup,
  });
}
