import '../models/treatment_models.dart';
import 'treatment_repository.dart';

/// Legacy Mock Repository maintained for backward compatibility.
/// Delegates all state and operations to the real TreatmentRepository connected to Backend.
class MockTreatmentRepository {
  static final MockTreatmentRepository _instance = MockTreatmentRepository._internal();
  factory MockTreatmentRepository() => _instance;
  MockTreatmentRepository._internal();

  final TreatmentRepository _realRepo = TreatmentRepository.instance;

  List<UserPackageModel> get packages => _realRepo.packages;
  List<SuggestedPackageModel> get suggestedPackages => _realRepo.suggestedPackages;
  List<CareJournalEntryModel> get journalEntries => _realRepo.journalEntries;
  List<HomeCareArticleModel> get guidelineArticles => _realRepo.guidelineArticles;
  List<ChatMessageModel> get chatMessages => _realRepo.chatMessages;
  List<TreatmentNotificationModel> get notifications => _realRepo.notifications;
  ConsultationPreferenceModel get latestConsultation => _realRepo.latestConsultation;
  ServiceReviewDataModel get latestReview => _realRepo.latestReview;
  UserPackageModel? get mainPackage => _realRepo.mainPackage;

  void toggleSuggestedFavorite(String id) => _realRepo.toggleSuggestedFavorite(id);
  void addJournalNote(String note) => _realRepo.addJournalNote(note);
  void saveConsultation(ConsultationPreferenceModel model) => _realRepo.saveConsultation(model);
  void saveReview(ServiceReviewDataModel model) => _realRepo.saveReview(model);
  void submitReviewData(ServiceReviewDataModel model) => _realRepo.submitReviewData(model);
  List<HomeCareArticleModel> getGuidelineArticles() => _realRepo.getGuidelineArticles();
  List<ChatMessageModel> getChatMessages() => _realRepo.getChatMessages();
  List<TreatmentNotificationModel> getTreatmentNotifications() => _realRepo.getTreatmentNotifications();
  void sendChatMessage(String text) => _realRepo.sendChatMessage(text);
  void markAllNotificationsRead() => _realRepo.markAllNotificationsRead();
  void markNotificationRead(String id) => _realRepo.markNotificationRead(id);
}
