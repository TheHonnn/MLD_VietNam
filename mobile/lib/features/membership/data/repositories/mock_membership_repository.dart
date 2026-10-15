import 'package:shared_preferences/shared_preferences.dart';
import '../models/membership_models.dart';

class MockMembershipRepository {
  static final MockMembershipRepository _instance = MockMembershipRepository._internal();
  factory MockMembershipRepository() => _instance;
  MockMembershipRepository._internal() {
    _loadPersistedProfile();
  }

  static const String _avatarPrefKey = 'user_avatar_url';
  static const String _namePrefKey = 'user_full_name';
  static const String _phonePrefKey = 'user_phone';
  static const String _emailPrefKey = 'user_email';

  Future<void> _loadPersistedProfile() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedAvatar = prefs.getString(_avatarPrefKey);
      final savedName = prefs.getString(_namePrefKey);
      final savedPhone = prefs.getString(_phonePrefKey);
      final savedEmail = prefs.getString(_emailPrefKey);

      if (savedAvatar != null || savedName != null || savedPhone != null || savedEmail != null) {
        _userProfile = _userProfile.copyWith(
          avatarUrl: savedAvatar ?? _userProfile.avatarUrl,
          fullName: savedName ?? _userProfile.fullName,
          phone: savedPhone ?? _userProfile.phone,
          email: savedEmail ?? _userProfile.email,
        );
      }
    } catch (_) {}
  }

  UserProfile _userProfile = const UserProfile(
    id: 'user-000128',
    fullName: 'Nguyễn Minh Anh',
    phone: '0912 345 678',
    isPhoneVerified: true,
    email: 'minh.anh@example.com',
    dateOfBirth: '15/08/1998',
    gender: 'Nữ',
    address: '12 Đường Mẫu, Phường Mẫu, TP. Hồ Chí Minh',
    occupation: 'Nhân viên văn phòng',
    emergencyContactName: 'Nguyễn Văn B',
    emergencyContactPhone: '0901 234 567',
    avatarUrl: 'assets/images/le_hoai_an.png',
    memberTier: 'Hội viên Vàng',
    memberCode: 'WM-000128',
    points: 2450,
    validUntil: '31/12/2026',
  );

  UserSettings _userSettings = const UserSettings(
    notifyAppointments: true,
    notifyTreatments: true,
    notifyCourses: true,
    notifyPromotions: false,
    language: 'Tiếng Việt',
    preferredBranch: 'Chi nhánh mẫu 01 — Quận 3',
    theme: 'Sáng',
    version: '1.0.0 — Demo',
  );

  final List<MembershipPerk> _perks = const [
    MembershipPerk(
      icon: 'badge-percent',
      title: 'Ưu đãi dịch vụ 10%',
      description: 'Giảm trực tiếp 10% cho mọi dịch vụ chăm sóc da và trị liệu tại tất cả chi nhánh.',
    ),
    MembershipPerk(
      icon: 'sparkles',
      title: 'Nhân 1.5x điểm tích lũy',
      description: 'Nhân 1.5 lần điểm thưởng cho tất cả các giao dịch phát sinh trong tháng sinh nhật.',
    ),
    MembershipPerk(
      icon: 'gift',
      title: 'Quà tri ân thường niên',
      description: 'Nhận bộ quà tặng cao cấp MLD phiên bản giới hạn nhân dịp kỷ niệm hội viên.',
    ),
    MembershipPerk(
      icon: 'crown',
      title: 'Ưu tiên đặt lịch & chọn chuyên viên',
      description: 'Giữ chỗ ưu tiên trong khung giờ cao điểm và được chỉ định kỹ thuật viên trưởng.',
    ),
  ];

  final List<MembershipTier> _tiers = const [
    MembershipTier(name: 'Thành viên', minPoints: 0, isCurrent: false),
    MembershipTier(name: 'Bạc', minPoints: 1000, isCurrent: false),
    MembershipTier(name: 'Vàng', minPoints: 2000, isCurrent: true),
    MembershipTier(name: 'Kim cương', minPoints: 3000, isCurrent: false),
  ];

  final List<PointsTransaction> _pointHistory = const [
    PointsTransaction(
      id: 'pt-01',
      type: 'EARN',
      title: 'Massage thư giãn toàn thân',
      date: '08/10/2026',
      branch: 'Chi nhánh mẫu 01 — Quận 3',
      points: '+150',
    ),
    PointsTransaction(
      id: 'pt-02',
      type: 'REDEEM',
      title: 'Đổi voucher chăm sóc da 100.000đ',
      date: '05/10/2026',
      branch: 'Ứng dụng di động',
      points: '−500',
    ),
    PointsTransaction(
      id: 'pt-03',
      type: 'EARN',
      title: 'Giới thiệu bạn bè thành công',
      date: '03/10/2026',
      branch: 'Chương trình giới thiệu',
      points: '+200',
    ),
  ];

  final List<RewardItem> _rewards = const [
    RewardItem(
      id: 'rw-01',
      title: 'Voucher chăm sóc da 100.000đ',
      pointsRequired: 500,
      condition: 'Hóa đơn chăm sóc da từ 500.000đ. Không cộng dồn ưu đãi khác.',
    ),
    RewardItem(
      id: 'rw-02',
      title: 'Voucher dịch vụ giảm 20%',
      pointsRequired: 300,
      condition: 'Hóa đơn massage từ 300.000đ, giảm tối đa 150.000đ.',
    ),
    RewardItem(
      id: 'rw-03',
      title: 'Quà trải nghiệm chăm sóc cơ thể',
      pointsRequired: 800,
      condition: 'Áp dụng cho 01 dịch vụ chăm sóc cơ thể tiêu chuẩn, cần đặt lịch trước.',
    ),
  ];

  final List<VoucherItem> _vouchers = const [
    VoucherItem(
      id: 'vc-01',
      title: 'Ưu đãi dịch vụ massage',
      subtitle: 'Dành thời gian thư giãn và chăm sóc bản thân.',
      discountBanner: 'GIẢM 20%',
      description:
          'Hóa đơn massage từ 300.000đ; giảm tối đa 150.000đ. Chi nhánh mẫu 01 — Quận 3. Không cộng dồn ưu đãi khác. Điều kiện minh họa.',
      expiryDate: '31/12/2026',
      code: 'MASSAGE20DEMO',
      status: 'AVAILABLE',
      statusText: 'Có thể sử dụng · Dữ liệu minh họa',
    ),
    VoucherItem(
      id: 'vc-02',
      title: 'Áp dụng cho dịch vụ chăm sóc da',
      subtitle: 'Một đặc quyền nhỏ cho làn da được nâng niu.',
      discountBanner: 'GIẢM 100.000Đ',
      description:
          'Hóa đơn chăm sóc da từ 500.000đ. Áp dụng tại Chi nhánh mẫu 01 — Quận 3. Áp dụng theo điều kiện minh họa.',
      expiryDate: '15/11/2026',
      code: 'DA100DEMO',
      status: 'AVAILABLE',
      statusText: 'Có thể sử dụng · Dữ liệu minh họa',
    ),
    VoucherItem(
      id: 'vc-03',
      title: 'Trải nghiệm chăm sóc cơ thể',
      subtitle: 'Áp dụng theo điều kiện chương trình',
      discountBanner: 'TẶNG 01 BUỔI',
      description:
          'Dành cho trải nghiệm mới của dịch vụ cơ thể đủ điều kiện. Cần đặt lịch hẹn trước ít nhất 24 giờ.',
      expiryDate: '31/10/2026',
      code: 'BODY01DEMO',
      status: 'AVAILABLE',
      statusText: 'Có thể sử dụng · Dữ liệu minh họa',
    ),
  ];

  final List<PaymentTransaction> _payments = const [
    PaymentTransaction(
      id: 'pay-01',
      code: 'MH-DV-1008 · Minh họa',
      date: '08/10/2026',
      type: 'Dịch vụ',
      icon: 'receipt',
      serviceName: 'Massage thư giãn toàn thân',
      branch: 'Chi nhánh mẫu 01 — Quận 3',
      amount: 450000,
      amountFormatted: '450.000đ',
      status: 'SUCCESS',
      statusLabel: 'Thanh toán thành công (mô phỏng)',
      paymentMethod: 'Thanh toán tại cơ sở',
      refundAmount: 0,
      remainingAmount: 0,
    ),
    PaymentTransaction(
      id: 'pay-02',
      code: 'MH-LT-1005 · Minh họa',
      date: '05/10/2026',
      type: 'Liệu trình',
      icon: 'receipt',
      serviceName: 'Gói chăm sóc da 8 buổi',
      branch: 'Chi nhánh mẫu 01 — Quận 3',
      amount: 3600000,
      amountFormatted: '3.600.000đ',
      status: 'SUCCESS',
      statusLabel: 'Thanh toán thành công (mô phỏng)',
      paymentMethod: 'Thanh toán trực tuyến',
      refundAmount: 0,
      remainingAmount: 0,
    ),
    PaymentTransaction(
      id: 'pay-03',
      code: 'MH-HP-1001 · Minh họa',
      date: '01/10/2026',
      type: 'Học phí',
      icon: 'graduation-cap',
      serviceName: 'Học phí khóa Kỹ thuật Spa Cơ bản',
      branch: 'Học viện · Chi nhánh mẫu 01 — Quận 3',
      amount: 4500000,
      amountFormatted: '4.500.000đ',
      status: 'SUCCESS',
      statusLabel: 'Thanh toán thành công (mô phỏng)',
      paymentMethod: 'Chuyển khoản',
      refundAmount: 0,
      remainingAmount: 0,
    ),
  ];

  final List<ReferralRecord> _referralHistory = const [
    ReferralRecord(
      id: 'ref-01',
      maskedName: 'N*** Linh',
      date: '02/10/2026',
      status: 'ELIGIBLE',
      statusText: 'Đủ điều kiện',
      points: '+100 điểm',
      recordedDate: '03/10/2026',
    ),
    ReferralRecord(
      id: 'ref-02',
      maskedName: 'Tr*** Ngọc',
      date: '03/10/2026',
      status: 'ELIGIBLE',
      statusText: 'Đủ điều kiện',
      points: '+100 điểm',
      recordedDate: '03/10/2026',
    ),
    ReferralRecord(
      id: 'ref-03',
      maskedName: 'Ph*** Hà',
      date: '08/10/2026',
      status: 'PENDING',
      statusText: 'Đang chờ',
      points: '0 điểm',
      recordedDate: 'Chưa đủ điều kiện · Chưa ghi nhận điểm',
    ),
  ];

  // Getters
  UserProfile get profile => _userProfile;
  UserSettings get settings => _userSettings;
  List<MembershipPerk> get perks => _perks;
  List<MembershipTier> get tiers => _tiers;
  List<PointsTransaction> get pointHistory => _pointHistory;
  List<RewardItem> get rewards => _rewards;
  List<VoucherItem> get vouchers => _vouchers;
  List<PaymentTransaction> get payments => _payments;
  List<ReferralRecord> get referralHistory => _referralHistory;

  // Actions
  void updateProfile(UserProfile updated) {
    _userProfile = updated;
    SharedPreferences.getInstance().then((prefs) {
      prefs.setString(_avatarPrefKey, updated.avatarUrl);
      prefs.setString(_namePrefKey, updated.fullName);
      prefs.setString(_phonePrefKey, updated.phone);
      prefs.setString(_emailPrefKey, updated.email);
    }).catchError((_) {});
  }

  void updateAvatar(String newAvatarUrl) {
    _userProfile = _userProfile.copyWith(avatarUrl: newAvatarUrl);
    SharedPreferences.getInstance().then((prefs) {
      prefs.setString(_avatarPrefKey, newAvatarUrl);
    }).catchError((_) {});
  }

  void updateSettings(UserSettings updated) {
    _userSettings = updated;
  }
}
