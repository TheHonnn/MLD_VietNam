// Mô hình dữ liệu Phân hệ Group D (Treatment & Customer Care)
// Chuẩn 100% Figma Design System (Node 8112:7818)

enum PackageStatus { active, completed, expired }

/// Mô hình một buổi trong phác đồ điều trị / lịch sử sử dụng (D02)
class TreatmentSessionModel {
  final int sessionNumber;
  final String title;
  final String status; // 'COMPLETED', 'PENDING'
  final String date;
  final String? note;
  final String specialistName;
  final String branchName;
  final String? postCareAdvice;

  const TreatmentSessionModel({
    required this.sessionNumber,
    required this.title,
    required this.status,
    required this.date,
    this.note,
    this.specialistName = 'Trần Minh Phương',
    this.branchName = 'Chi nhánh Quận 3',
    this.postCareAdvice,
  });

  bool get isCompleted => status == 'COMPLETED';
}

/// Mô hình Gói liệu trình của người dùng (D01 & D02)
class UserPackageModel {
  final String id;
  final String packageName;
  final String description;
  final String imageUrl;
  final int totalSessions;
  final int completedSessions;
  final PackageStatus status;
  final String expiryDate;
  final String specialistName;
  final String branchName;
  final double price;
  final String nextAppointmentText;
  final String nextAppointmentDate;
  final String nextAppointmentService;
  final List<TreatmentSessionModel> sessions;

  const UserPackageModel({
    required this.id,
    required this.packageName,
    required this.description,
    required this.imageUrl,
    required this.totalSessions,
    required this.completedSessions,
    required this.status,
    required this.expiryDate,
    required this.specialistName,
    required this.branchName,
    required this.price,
    this.nextAppointmentText = 'Buổi 05 · Lịch hẹn sắp tới',
    this.nextAppointmentDate = '15/10/2026 · 09:00–10:00',
    this.nextAppointmentService = 'Massage thư giãn toàn thân',
    required this.sessions,
  });

  int get remainingSessions => totalSessions - completedSessions;
  double get progressPercent => totalSessions > 0 ? (completedSessions / totalSessions) : 0.0;
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

/// Mô hình mục Nhật ký chăm sóc (D03 CareJournal)
class CareJournalEntryModel {
  final String id;
  final int sessionNumber;
  final String date;
  final String serviceTitle;
  final String specialistName;
  final String branchName;
  final String sessionNote;
  final String postCareSuggestion;
  final String? bookingId;
  final String? serviceId;
  final String? technicianId;

  const CareJournalEntryModel({
    required this.id,
    required this.sessionNumber,
    required this.date,
    required this.serviceTitle,
    required this.specialistName,
    required this.branchName,
    required this.sessionNote,
    required this.postCareSuggestion,
    this.bookingId,
    this.serviceId,
    this.technicianId,
  });
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
