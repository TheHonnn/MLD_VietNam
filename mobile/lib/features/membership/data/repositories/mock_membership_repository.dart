import '../models/membership_models.dart';
import 'membership_repository.dart';

/// Legacy Mock Repository maintained for backward compatibility.
/// Delegates all state and operations to the real MembershipRepository connected to Backend.
class MockMembershipRepository {
  static final MockMembershipRepository _instance = MockMembershipRepository._internal();
  factory MockMembershipRepository() => _instance;
  MockMembershipRepository._internal();

  final MembershipRepository _realRepo = MembershipRepository.instance;

  UserProfile get profile => _realRepo.profile;
  UserSettings get settings => _realRepo.settings;
  List<MembershipPerk> get perks => _realRepo.perks;
  List<MembershipTier> get tiers => _realRepo.tiers;
  List<PointsTransaction> get pointHistory => _realRepo.pointHistory;
  List<RewardItem> get rewards => _realRepo.rewards;
  List<VoucherItem> get vouchers => _realRepo.vouchers;
  List<PaymentTransaction> get payments => _realRepo.payments;
  List<ReferralRecord> get referralHistory => _realRepo.referralHistory;

  Future<UserProfile> fetchProfile() => _realRepo.fetchProfile();
  void updateProfile(UserProfile updated) => _realRepo.updateProfile(updated);
  void updateAvatar(String newAvatarUrl) => _realRepo.updateAvatar(newAvatarUrl);
  void updateSettings(UserSettings updated) => _realRepo.updateSettings(updated);
  Future<List<PointsTransaction>> fetchLoyaltyPoints() => _realRepo.fetchLoyaltyPoints();
  Future<void> redeemReward(RewardItem reward) => _realRepo.redeemReward(reward);
  Future<List<VoucherItem>> fetchVouchers({String? filter}) => _realRepo.fetchVouchers(filter: filter);
  Future<List<PaymentTransaction>> fetchPaymentHistory({String? month, String? category}) =>
      _realRepo.fetchPaymentHistory(month: month, category: category);
  Future<List<ReferralRecord>> fetchReferralProgram() => _realRepo.fetchReferralProgram();
}
