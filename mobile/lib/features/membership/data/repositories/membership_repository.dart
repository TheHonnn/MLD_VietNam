import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../core/services/auth_service.dart';
import '../models/membership_models.dart';

/// Central Membership Repository connecting Mobile to NestJS Backend Gateway
/// (/api/v1/membership/*) with automatic offline resilience.
class MembershipRepository {
  MembershipRepository._internal() {
    _initData();
    _loadPersistedProfile();
  }
  static final MembershipRepository instance = MembershipRepository._internal();
  factory MembershipRepository() => instance;

  final ApiClient _apiClient = ApiClient.instance;

  static const String _avatarPrefKey = 'user_avatar_url';
  static const String _namePrefKey = 'user_full_name';
  static const String _phonePrefKey = 'user_phone';
  static const String _emailPrefKey = 'user_email';
  static const String _memberCodePrefKey = 'user_member_code';

  UserProfile _userProfile = const UserProfile(
    id: 'user-000001',
    fullName: '',
    phone: '',
    isPhoneVerified: false,
    email: '',
    dateOfBirth: '',
    gender: 'Nữ',
    address: '',
    occupation: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    avatarUrl: '',
    memberTier: 'Thành viên',
    memberCode: '',
    points: 0,
    validUntil: 'Đang hoạt động',
  );

  UserSettings _userSettings = const UserSettings(
    notifyAppointments: true,
    notifyTreatments: true,
    notifyCourses: true,
    notifyPromotions: false,
    language: 'Tiếng Việt',
    preferredBranch: 'Chi nhánh Quận 3',
    theme: 'Sáng',
    version: '1.0.0',
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
    MembershipTier(name: 'Thành viên', minPoints: 0, isCurrent: true),
    MembershipTier(name: 'Bạc', minPoints: 1000, isCurrent: false),
    MembershipTier(name: 'Vàng', minPoints: 2000, isCurrent: false),
    MembershipTier(name: 'Kim cương', minPoints: 3000, isCurrent: false),
  ];

  final List<PointsTransaction> _pointHistory = [];
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

  final List<VoucherItem> _vouchers = [];
  final List<PaymentTransaction> _payments = [];
  final List<ReferralRecord> _referralHistory = [];

  void _initData() {
    _payments.addAll([
      const PaymentTransaction(
        id: 'pay-01',
        code: 'PAY-102601',
        date: '15/10/2026',
        type: 'Dịch vụ',
        icon: 'receipt',
        serviceName: 'Massage thư giãn toàn thân 60 phút',
        branch: 'Chi nhánh Quận 3',
        amount: 450000,
        amountFormatted: '450.000đ',
        status: 'SUCCESS',
        statusLabel: 'Thành công',
        paymentMethod: 'VietQR MBBank',
        refundAmount: 0,
        remainingAmount: 0,
      ),
      const PaymentTransaction(
        id: 'pay-02',
        code: 'PAY-102602',
        date: '08/10/2026',
        type: 'Liệu trình',
        icon: 'receipt',
        serviceName: 'Gói Chăm Sóc Da Chuyên Sâu Tái Tạo',
        branch: 'Chi nhánh Quận 3',
        amount: 2800000,
        amountFormatted: '2.800.000đ',
        status: 'SUCCESS',
        statusLabel: 'Thành công',
        paymentMethod: 'Chuyển khoản VietQR',
        refundAmount: 0,
        remainingAmount: 0,
      ),
      const PaymentTransaction(
        id: 'pay-03',
        code: 'PAY-092601',
        date: '20/09/2026',
        type: 'Học phí',
        icon: 'graduation-cap',
        serviceName: 'Khóa học Massage Chuyên Nghiệp',
        branch: 'Học viện MLD Quận 3',
        amount: 2000000,
        amountFormatted: '2.000.000đ',
        status: 'SUCCESS',
        statusLabel: 'Thành công',
        paymentMethod: 'Chuyển khoản VietQR',
        refundAmount: 0,
        remainingAmount: 0,
      ),
    ]);
  }

  // Getters
  UserProfile get profile => _userProfile;
  UserSettings get settings => _userSettings;
  List<MembershipPerk> get perks => _perks;
  List<MembershipTier> get tiers => _tiers;
  List<PointsTransaction> get pointHistory => List.unmodifiable(_pointHistory);
  List<RewardItem> get rewards => _rewards;
  List<VoucherItem> get vouchers => List.unmodifiable(_vouchers);
  List<PaymentTransaction> get payments => List.unmodifiable(_payments);
  List<ReferralRecord> get referralHistory => List.unmodifiable(_referralHistory);

  Future<void> _loadPersistedProfile() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedAvatar = prefs.getString(_avatarPrefKey);
      final savedName = prefs.getString(_namePrefKey);
      final savedPhone = prefs.getString(_phonePrefKey);
      final savedEmail = prefs.getString(_emailPrefKey);

      if (savedEmail == 'minh.anh@example.com' || savedEmail == 'letan.q3@mldvietnam.vn') {
        await prefs.remove(_emailPrefKey);
      }
      if (savedName == 'Nguyễn Minh Anh' || savedName == 'Lễ Tân Hoàng Yến') {
        await prefs.remove(_namePrefKey);
      }
      final cleanSavedEmail = prefs.getString(_emailPrefKey);
      final cleanSavedName = prefs.getString(_namePrefKey);
      final effectiveEmail = (cleanSavedEmail != null &&
              cleanSavedEmail != 'minh.anh@example.com' &&
              cleanSavedEmail != 'letan.q3@mldvietnam.vn')
          ? cleanSavedEmail
          : '';

      final authPhone = AuthService.instance.currentPhone;
      final effectivePhone = (authPhone != null && authPhone.isNotEmpty)
          ? authPhone
          : (savedPhone ?? '');

      final authDisplayName = AuthService.instance.currentDisplayName;
      final effectiveFullName = (authDisplayName != null && authDisplayName.isNotEmpty)
          ? authDisplayName
          : (cleanSavedName ?? _userProfile.fullName);

      _userProfile = _userProfile.copyWith(
        avatarUrl: savedAvatar ?? _userProfile.avatarUrl,
        fullName: effectiveFullName,
        phone: effectivePhone,
        isPhoneVerified: effectivePhone.isNotEmpty,
        email: effectiveEmail,
        memberCode: prefs.getString(_memberCodePrefKey)?.isNotEmpty == true
            ? prefs.getString(_memberCodePrefKey)!
            : _userProfile.memberCode,
      );
    } catch (_) {}
  }

  /// Đồng bộ tức thì thông tin người dùng vừa đăng nhập hoặc xác thực OTP thành công
  void syncUserSession({
    String? fullName,
    String? phone,
    String? email,
    String? avatarUrl,
    String? memberCode,
  }) {
    final cleanName = fullName?.trim() ?? '';
    final cleanPhone = phone?.trim() ?? '';
    final cleanEmail = email?.trim() ?? '';
    final cleanAvatar = avatarUrl?.trim() ?? '';

    String derivedCode = (memberCode != null && memberCode.trim().isNotEmpty)
        ? memberCode.trim()
        : _userProfile.memberCode;
    if (derivedCode.isEmpty || derivedCode == 'MLD-000001') {
      if (cleanPhone.isNotEmpty) {
        final nums = cleanPhone.replaceAll(RegExp(r'\D'), '');
        derivedCode = 'MLD-${nums.length >= 6 ? nums.substring(nums.length - 6) : nums.padLeft(6, '0')}';
      }
    }

    _userProfile = _userProfile.copyWith(
      fullName: cleanName.isNotEmpty ? cleanName : _userProfile.fullName,
      phone: cleanPhone.isNotEmpty ? cleanPhone : _userProfile.phone,
      isPhoneVerified: cleanPhone.isNotEmpty ? true : _userProfile.isPhoneVerified,
      email: cleanEmail.isNotEmpty ? cleanEmail : _userProfile.email,
      avatarUrl: cleanAvatar.isNotEmpty ? cleanAvatar : _userProfile.avatarUrl,
      memberCode: derivedCode.isNotEmpty ? derivedCode : _userProfile.memberCode,
    );
    _persistLocalProfile(_userProfile);
  }

  /// F01/F02: Lấy thông tin hồ sơ cá nhân từ Live Backend Gateway
  Future<UserProfile> fetchProfile() async {
    try {
      final response = await _apiClient.dio.get(ApiEndpoints.membershipProfile);
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data['data'] ?? response.data;
        if (data is Map<String, dynamic>) {
          final serverPhone = data['phone']?.toString() ?? '';
          final currentAuthPhone = AuthService.instance.currentPhone ?? '';
          final finalPhone = currentAuthPhone.isNotEmpty ? currentAuthPhone : serverPhone;

          final serverName = data['fullName']?.toString() ?? '';
          final currentAuthName = AuthService.instance.currentDisplayName ?? '';
          final isInvalidMockName = serverName == 'Lễ Tân Hoàng Yến' ||
              serverName == 'Nguyễn Minh Anh' ||
              serverName == 'Khách hàng MLD';
          final finalFullName = (!isInvalidMockName && serverName.isNotEmpty)
              ? serverName
              : (currentAuthName.isNotEmpty ? currentAuthName : (serverName.isNotEmpty ? serverName : _userProfile.fullName));

          final serverEmail = data['email']?.toString() ?? '';
          final isInvalidMockEmail = serverEmail == 'letan.q3@mldvietnam.vn' ||
              serverEmail == 'minh.anh@example.com';
          final finalEmail = (!isInvalidMockEmail && serverEmail.isNotEmpty)
              ? serverEmail
              : _userProfile.email;

          _userProfile = _userProfile.copyWith(
            fullName: finalFullName,
            phone: finalPhone,
            isPhoneVerified: finalPhone.isNotEmpty,
            email: finalEmail,
            dateOfBirth: data['dateOfBirth']?.toString() ?? _userProfile.dateOfBirth,
            gender: data['gender']?.toString() ?? _userProfile.gender,
            address: data['address']?.toString() ?? _userProfile.address,
            occupation: data['occupation']?.toString() ?? _userProfile.occupation,
            emergencyContactName: data['emergencyContactName']?.toString() ?? _userProfile.emergencyContactName,
            emergencyContactPhone: data['emergencyContactPhone']?.toString() ?? _userProfile.emergencyContactPhone,
            avatarUrl: data['avatarUrl']?.toString() ?? _userProfile.avatarUrl,
            memberTier: data['memberTier']?.toString() ?? _userProfile.memberTier,
            memberCode: data['memberCode']?.toString() ?? _userProfile.memberCode,
            points: (data['points'] as num?)?.toInt() ?? _userProfile.points,
            validUntil: data['validUntil']?.toString() ?? _userProfile.validUntil,
          );
          _persistLocalProfile(_userProfile);
        }
      }
    } catch (e) {
      debugPrint('>>> [MembershipRepository] Error fetching profile: $e');
    }
    // Đồng bộ trực tiếp mã hội viên (referral_code) từ bảng users Supabase Cloud
    final lookupPhone = _userProfile.phone.trim();
    final lookupId = AuthService.instance.currentUserId;
    if (lookupPhone.isNotEmpty || (lookupId != null && lookupId.isNotEmpty)) {
      try {
        final queryParam = lookupPhone.isNotEmpty ? 'phone=eq.$lookupPhone' : 'id=eq.$lookupId';
        final sRes = await _apiClient.dio.get('${ApiEndpoints.users}?$queryParam&select=referral_code,membership_tier,reward_points&limit=1');
        if (sRes.statusCode == 200 && sRes.data is List && (sRes.data as List).isNotEmpty) {
          final u = (sRes.data as List).first as Map<String, dynamic>;
          final dbCode = u['referral_code']?.toString() ?? '';
          final dbPoints = (u['reward_points'] as num?)?.toInt();
          final dbTier = u['membership_tier']?.toString();
          if (dbCode.isNotEmpty) {
            _userProfile = _userProfile.copyWith(
              memberCode: dbCode,
              points: dbPoints ?? _userProfile.points,
              memberTier: dbTier != null ? _mapTierName(dbTier) : _userProfile.memberTier,
            );
            _persistLocalProfile(_userProfile);
          }
        }
      } catch (_) {}
    }
    return _userProfile;
  }

  /// F02: Cập nhật thông tin hồ sơ lên Backend
  Future<void> updateProfile(UserProfile updated) async {
    final effectivePhone = updated.phone.trim();
    final isVerified = updated.isPhoneVerified || effectivePhone.isNotEmpty;
    _userProfile = updated.copyWith(
      phone: effectivePhone,
      isPhoneVerified: isVerified,
    );
    _persistLocalProfile(_userProfile);

    if (updated.phone.trim().isNotEmpty) {
      AuthService.instance.updatePhone(updated.phone.trim());
    }

    try {
      await _apiClient.dio.put(
        ApiEndpoints.membershipProfile,
        data: {
          'fullName': updated.fullName,
          'phone': updated.phone,
          'email': updated.email,
          'dateOfBirth': updated.dateOfBirth,
          'gender': updated.gender,
          'address': updated.address,
          'occupation': updated.occupation,
          'emergencyContactName': updated.emergencyContactName,
          'emergencyContactPhone': updated.emergencyContactPhone,
          'avatarUrl': updated.avatarUrl,
        },
      );
    } catch (e) {
      debugPrint('>>> [MembershipRepository] Error updating profile: $e');
    }
  }

  void updateAvatar(String newAvatarUrl) {
    _userProfile = _userProfile.copyWith(avatarUrl: newAvatarUrl);
    _persistLocalProfile(_userProfile);

    _apiClient.dio.put(
      ApiEndpoints.membershipProfile,
      data: {'avatarUrl': newAvatarUrl, 'fullName': _userProfile.fullName},
    ).then((_) {}, onError: (_) {});
  }

  /// F04: Lấy danh sách biến động điểm thưởng từ Backend Gateway
  Future<List<PointsTransaction>> fetchLoyaltyPoints() async {
    try {
      final response = await _apiClient.dio.get(ApiEndpoints.membershipPoints);
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data['data'] ?? response.data;
        if (data is Map<String, dynamic>) {
          if (data['currentPoints'] != null) {
            final pts = (data['currentPoints'] as num).toInt();
            _userProfile = _userProfile.copyWith(points: pts);
          }
          final rawHistory = data['history'];
          if (rawHistory is List && rawHistory.isNotEmpty) {
            final list = <PointsTransaction>[];
            for (final item in rawHistory) {
              if (item is Map<String, dynamic>) {
                list.add(
                  PointsTransaction(
                    id: item['id']?.toString() ?? 'pt-${DateTime.now().millisecondsSinceEpoch}',
                    type: item['type']?.toString() ?? 'EARN',
                    title: item['title']?.toString() ?? 'Tích điểm dịch vụ',
                    date: item['date']?.toString() ?? 'Gần đây',
                    branch: item['branch']?.toString() ?? 'Chi nhánh Quận 3',
                    points: item['points']?.toString() ?? '+0',
                  ),
                );
              }
            }
            if (list.isNotEmpty) {
              _pointHistory.clear();
              _pointHistory.addAll(list);
            }
          }
        }
      }
    } catch (e) {
      debugPrint('>>> [MembershipRepository] Error fetching loyalty points: $e');
    }
    return _pointHistory;
  }

  /// F04: Đổi điểm thưởng nhận voucher/quà
  Future<void> redeemReward(RewardItem reward) async {
    try {
      final res = await _apiClient.dio.post(
        ApiEndpoints.membershipPointsRedeem,
        data: {'code': reward.id},
      );
      if (res.data != null && res.data['currentPoints'] != null) {
        final pts = (res.data['currentPoints'] as num).toInt();
        _userProfile = _userProfile.copyWith(points: pts);
      }
      await fetchLoyaltyPoints();
      await fetchVouchers();
    } catch (e) {
      debugPrint('>>> [MembershipRepository] Error redeeming reward: $e');
    }
  }

  /// F05: Lấy danh sách voucher từ Backend Gateway
  Future<List<VoucherItem>> fetchVouchers({String? filter}) async {
    try {
      final response = await _apiClient.dio.get(
        ApiEndpoints.membershipVouchers,
        queryParameters: filter != null ? {'filter': filter} : null,
      );
      if (response.statusCode == 200 && response.data != null) {
        final raw = response.data['data'] ?? response.data;
        if (raw is List && raw.isNotEmpty) {
          final list = <VoucherItem>[];
          for (final item in raw) {
            if (item is Map<String, dynamic>) {
              list.add(
                VoucherItem(
                  id: item['id']?.toString() ?? 'vc-${DateTime.now().millisecondsSinceEpoch}',
                  title: item['title']?.toString() ?? 'Ưu đãi dịch vụ',
                  subtitle: item['subtitle']?.toString() ?? 'Đặc quyền hội viên',
                  discountBanner: item['discountBanner']?.toString() ?? 'GIẢM GIÁ',
                  description: item['description']?.toString() ?? '',
                  expiryDate: item['expiryDate']?.toString() ?? '31/12/2026',
                  code: item['code']?.toString() ?? 'MLDVIP',
                  status: item['status']?.toString() ?? 'AVAILABLE',
                  statusText: item['statusText']?.toString() ?? 'Có thể sử dụng',
                ),
              );
            }
          }
          if (list.isNotEmpty) {
            _vouchers.clear();
            _vouchers.addAll(list);
          }
        }
      }
    } catch (e) {
      debugPrint('>>> [MembershipRepository] Error fetching vouchers: $e');
    }
    return _vouchers;
  }

  /// F06: Lấy lịch sử thanh toán từ Backend Gateway
  Future<List<PaymentTransaction>> fetchPaymentHistory({String? month, String? category}) async {
    try {
      final response = await _apiClient.dio.get(
        ApiEndpoints.membershipPayments,
        queryParameters: {
          if (month != null) 'month': month,
          if (category != null) 'category': category,
        },
      );
      if (response.statusCode == 200 && response.data != null) {
        final raw = response.data['data'] ?? response.data;
        if (raw is List && raw.isNotEmpty) {
          final list = <PaymentTransaction>[];
          for (final item in raw) {
            if (item is Map<String, dynamic>) {
              list.add(
                PaymentTransaction(
                  id: item['id']?.toString() ?? 'pay-${DateTime.now().millisecondsSinceEpoch}',
                  code: item['code']?.toString() ?? '',
                  date: item['date']?.toString() ?? '',
                  type: item['type']?.toString() ?? 'Dịch vụ',
                  icon: item['icon']?.toString() ?? 'receipt',
                  serviceName: item['serviceName']?.toString() ?? 'Dịch vụ Spa',
                  branch: item['branch']?.toString() ?? 'Chi nhánh Quận 3',
                  amount: (item['amount'] as num?)?.toInt() ?? 0,
                  amountFormatted: item['amountFormatted']?.toString() ?? '0đ',
                  status: item['status']?.toString() ?? 'SUCCESS',
                  statusLabel: item['statusLabel']?.toString() ?? 'Thành công',
                  paymentMethod: item['paymentMethod']?.toString() ?? 'Thanh toán tại cơ sở',
                  refundAmount: (item['refundAmount'] as num?)?.toInt() ?? 0,
                  remainingAmount: (item['remainingAmount'] as num?)?.toInt() ?? 0,
                ),
              );
            }
          }
          if (list.isNotEmpty) {
            _payments.clear();
            _payments.addAll(list);
          }
        }
      }
    } catch (e) {
      debugPrint('>>> [MembershipRepository] Error fetching payment history: $e');
    }
    return _payments;
  }

  /// F07: Lấy dữ liệu giới thiệu bạn bè từ Backend Gateway
  Future<List<ReferralRecord>> fetchReferralProgram() async {
    try {
      final response = await _apiClient.dio.get(ApiEndpoints.membershipReferral);
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data['data'] ?? response.data;
        if (data is Map<String, dynamic>) {
          final rawHistory = data['history'];
          if (rawHistory is List && rawHistory.isNotEmpty) {
            final list = <ReferralRecord>[];
            for (final item in rawHistory) {
              if (item is Map<String, dynamic>) {
                list.add(
                  ReferralRecord(
                    id: item['id']?.toString() ?? 'ref-${DateTime.now().millisecondsSinceEpoch}',
                    maskedName: item['maskedName']?.toString() ?? 'Khách hàng',
                    date: item['date']?.toString() ?? '',
                    status: item['status']?.toString() ?? 'ELIGIBLE',
                    statusText: item['statusText']?.toString() ?? 'Đủ điều kiện',
                    points: item['points']?.toString() ?? '0 điểm',
                    recordedDate: item['recordedDate']?.toString() ?? '',
                  ),
                );
              }
            }
            if (list.isNotEmpty) {
              _referralHistory.clear();
              _referralHistory.addAll(list);
            }
          }
        }
      }
    } catch (e) {
      debugPrint('>>> [MembershipRepository] Error fetching referral program: $e');
    }
    return _referralHistory;
  }

  /// F08: Cập nhật cài đặt tài khoản
  Future<void> updateSettings(UserSettings updated) async {
    _userSettings = updated;
    try {
      await _apiClient.dio.put(
        ApiEndpoints.membershipSettings,
        data: {
          'notifyAppointments': updated.notifyAppointments,
          'notifyTreatments': updated.notifyTreatments,
          'notifyCourses': updated.notifyCourses,
          'notifyPromotions': updated.notifyPromotions,
          'language': updated.language,
          'preferredBranch': updated.preferredBranch,
          'theme': updated.theme,
        },
      );
    } catch (e) {
      debugPrint('>>> [MembershipRepository] Error updating settings: $e');
    }
  }

  String _mapTierName(String tier) {
    switch (tier.toUpperCase()) {
      case 'DIAMOND':
        return 'Hội viên Kim cương';
      case 'PLATINUM':
        return 'Hội viên Bạch kim';
      case 'GOLD':
        return 'Hội viên Vàng';
      case 'SILVER':
        return 'Hội viên Bạc';
      default:
        return 'Thành viên';
    }
  }

  void _persistLocalProfile(UserProfile p) {
    SharedPreferences.getInstance().then((prefs) {
      prefs.setString(_avatarPrefKey, p.avatarUrl);
      prefs.setString(_namePrefKey, p.fullName);
      prefs.setString(_phonePrefKey, p.phone);
      prefs.setString(_emailPrefKey, p.email);
      if (p.memberCode.isNotEmpty) {
        prefs.setString(_memberCodePrefKey, p.memberCode);
      }
    }).catchError((_) {});
  }
}
