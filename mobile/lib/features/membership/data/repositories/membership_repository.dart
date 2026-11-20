import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
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
    AuthService.instance.isLoggedInNotifier.addListener(() {
      if (!AuthService.instance.isLoggedIn) {
        resetProfile();
      }
    });
    AuthService.instance.addOnLogoutListener(() {
      resetProfile();
    });
  }
  static final MembershipRepository instance = MembershipRepository._internal();
  factory MembershipRepository() => instance;

  final ApiClient _apiClient = ApiClient.instance;

  static const String _avatarPrefKey = 'user_avatar_url';
  static const String _namePrefKey = 'user_full_name';
  static const String _phonePrefKey = 'user_phone';
  static const String _emailPrefKey = 'user_email';
  static const String _addressPrefKey = 'user_address';
  static const String _dobPrefKey = 'user_dob';
  static const String _genderPrefKey = 'user_gender';
  static const String _occupationPrefKey = 'user_occupation';
  static const String _emergencyNamePrefKey = 'user_emergency_name';
  static const String _emergencyPhonePrefKey = 'user_emergency_phone';
  static const String _memberCodePrefKey = 'user_member_code';
  static const String _referrerNamePrefKey = 'user_referrer_name';
  static const String _referredByIdPrefKey = 'user_referred_by_id';

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
      title: 'Voucher Chăm sóc Da 100.000đ',
      pointsRequired: 500,
      condition: 'Hóa đơn chăm sóc da từ 300.000đ. Không giới hạn chi nhánh. HSD: 6 tháng.',
    ),
    RewardItem(
      id: 'rw-02',
      title: 'Voucher Dịch vụ Giảm 20%',
      pointsRequired: 300,
      condition: 'Hóa đơn massage & trị liệu từ 300.000đ, giảm tối đa 150.000đ. HSD: 6 tháng.',
    ),
    RewardItem(
      id: 'rw-03',
      title: 'Quà Trải nghiệm Chăm sóc Cơ thể',
      pointsRequired: 800,
      condition: 'Áp dụng cho 01 dịch vụ chăm sóc cơ thể tiêu chuẩn 60 phút. Cần đặt lịch trước.',
    ),
    RewardItem(
      id: 'rw-04',
      title: 'Voucher Giảm 50.000đ Toàn hệ thống',
      pointsRequired: 250,
      condition: 'Áp dụng cho mọi hóa đơn dịch vụ bất kỳ tại MLD Việt Nam.',
    ),
    RewardItem(
      id: 'rw-05',
      title: 'Buổi Head Spa Dưỡng sinh Chuẩn Y khoa',
      pointsRequired: 400,
      condition: 'Tặng 01 buổi gội đầu dưỡng sinh Head Spa MLD thảo dược 45 phút.',
    ),
  ];

  final List<VoucherItem> _vouchers = [];
  final List<PaymentTransaction> _payments = [];
  final List<ReferralRecord> _referralHistory = [];

  void _initData() {


    _pointHistory.addAll([
      const PointsTransaction(
        id: 'pt-01',
        type: 'EARN',
        title: 'Tích điểm dịch vụ Massage',
        date: '15/10/2026',
        branch: 'Chi nhánh Quận 3',
        points: '+45',
      ),
      const PointsTransaction(
        id: 'pt-02',
        type: 'EARN',
        title: 'Tích điểm dịch vụ Chăm sóc da',
        date: '08/10/2026',
        branch: 'Chi nhánh Quận 3',
        points: '+280',
      ),
    ]);

    _vouchers.addAll([
      const VoucherItem(
        id: 'vc-01',
        title: 'Giảm 20% Dịch vụ Massage Chuyên Sâu',
        subtitle: 'Áp dụng cho mọi cơ sở',
        discountBanner: '20% OFF',
        description: 'Voucher chào mừng hội viên mới',
        expiryDate: '31/12/2026',
        code: 'MLDNEW20',
        status: 'AVAILABLE',
        statusText: 'Có thể sử dụng',
      ),
    ]);

    _referralHistory.addAll([
      const ReferralRecord(
        id: 'ref-01',
        maskedName: 'Nguyễn V***',
        date: '10/10/2026',
        status: 'ELIGIBLE',
        statusText: 'Đủ điều kiện',
        points: '+100',
        recordedDate: '10/10/2026',
      ),
    ]);
  }

  // Getters & Setters
  UserProfile get profile => _userProfile;
  UserProfile get userProfile => _userProfile;
  set profile(UserProfile p) => _userProfile = p;
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
      if (!AuthService.instance.isLoggedIn) {
        resetProfile();
        return;
      }
      final prefs = await SharedPreferences.getInstance();
      final savedAvatar = prefs.getString(_avatarPrefKey) ??
          prefs.getString('user_avatar_path') ??
          AuthService.instance.currentAvatarUrl ??
          '';
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

      final savedAddress = prefs.getString(_addressPrefKey);
      final savedDob = prefs.getString(_dobPrefKey);
      final savedGender = prefs.getString(_genderPrefKey);
      final savedOccupation = prefs.getString(_occupationPrefKey);
      final savedEmerName = prefs.getString(_emergencyNamePrefKey);
      final savedEmerPhone = prefs.getString(_emergencyPhonePrefKey);
      final savedReferrerName = prefs.getString(_referrerNamePrefKey);
      final savedReferredById = prefs.getString(_referredByIdPrefKey);

      _userProfile = _userProfile.copyWith(
        avatarUrl: savedAvatar.trim(),
        fullName: effectiveFullName,
        phone: effectivePhone,
        isPhoneVerified: effectivePhone.isNotEmpty,
        email: effectiveEmail,
        address: (savedAddress != null && savedAddress.isNotEmpty) ? savedAddress : _userProfile.address,
        dateOfBirth: (savedDob != null && savedDob.isNotEmpty) ? savedDob : _userProfile.dateOfBirth,
        gender: (savedGender != null && savedGender.isNotEmpty) ? savedGender : _userProfile.gender,
        occupation: (savedOccupation != null && savedOccupation.isNotEmpty) ? savedOccupation : _userProfile.occupation,
        emergencyContactName: (savedEmerName != null && savedEmerName.isNotEmpty) ? savedEmerName : _userProfile.emergencyContactName,
        emergencyContactPhone: (savedEmerPhone != null && savedEmerPhone.isNotEmpty) ? savedEmerPhone : _userProfile.emergencyContactPhone,
        memberCode: prefs.getString(_memberCodePrefKey)?.isNotEmpty == true
            ? prefs.getString(_memberCodePrefKey)!
            : _userProfile.memberCode,
        referrerName: savedReferrerName,
        referredById: savedReferredById,
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
    String? role,
  }) {
    final cleanName = fullName?.trim() ?? '';
    final cleanPhone = phone?.trim() ?? '';
    final cleanEmail = email?.trim() ?? '';
    final cleanAvatar = avatarUrl?.trim() ?? '';
    final cleanRole = role?.trim().toUpperCase();

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
      isPhoneVerified: cleanPhone.isNotEmpty || _userProfile.isPhoneVerified,
      email: cleanEmail.isNotEmpty ? cleanEmail : _userProfile.email,
      avatarUrl: cleanAvatar.isNotEmpty ? cleanAvatar : _userProfile.avatarUrl,
      memberCode: derivedCode.isNotEmpty ? derivedCode : _userProfile.memberCode,
      role: (cleanRole != null && cleanRole.isNotEmpty) ? cleanRole : _userProfile.role,
    );
    _persistLocalProfile(_userProfile);
  }

  /// F01/F02: Lấy thông tin hồ sơ cá nhân từ Live Backend Gateway & Supabase Database
  Future<UserProfile> fetchProfile() async {
    // Nếu chưa đăng nhập hoặc đang ở chế độ khách thì không gọi backend tránh lỗi 400/401
    if (!AuthService.instance.isAuthenticated || AuthService.instance.isGuest) {
      return _userProfile;
    }

    final currentAuthPhone = AuthService.instance.currentPhone?.trim() ?? '';
    final lookupPhone = currentAuthPhone.isNotEmpty ? currentAuthPhone : _userProfile.phone.trim();
    final lookupEmail = _userProfile.email.trim();

    try {
      final queryParams = <String, dynamic>{
        if (lookupPhone.isNotEmpty) 'phone': lookupPhone,
        if (lookupEmail.isNotEmpty) 'email': lookupEmail,
      };

      final response = await _apiClient.dio.get(
        ApiEndpoints.membershipProfile,
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
      );
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data['data'] ?? response.data;
        if (data is Map<String, dynamic>) {
          final serverPhone = data['phone']?.toString().trim() ?? '';
          final finalPhone = lookupPhone.isNotEmpty ? lookupPhone : (serverPhone.isNotEmpty ? serverPhone : _userProfile.phone);

          final serverName = data['fullName']?.toString().trim() ?? '';
          final currentAuthName = AuthService.instance.currentDisplayName?.trim() ?? '';
          final isInvalidMockName = serverName == 'Lễ Tân Hoàng Yến' ||
              serverName == 'Nguyễn Minh Anh' ||
              serverName == 'Khách hàng MLD';
          final finalFullName = (!isInvalidMockName && serverName.isNotEmpty)
              ? serverName
              : (currentAuthName.isNotEmpty ? currentAuthName : (serverName.isNotEmpty ? serverName : _userProfile.fullName));

          final serverEmail = data['email']?.toString().trim() ?? '';
          final isInvalidMockEmail = serverEmail == 'letan.q3@mldvietnam.vn' ||
              serverEmail == 'minh.anh@example.com';
          final finalEmail = (!isInvalidMockEmail && serverEmail.isNotEmpty)
              ? serverEmail
              : _userProfile.email;

          final rawServerDob = data['dateOfBirth']?.toString().trim() ?? '';
          String finalDob = _userProfile.dateOfBirth;
          if (rawServerDob.isNotEmpty) {
            if (rawServerDob.contains('-')) {
              final dParts = rawServerDob.split('-');
              if (dParts.length == 3 && dParts[0].length == 4) {
                finalDob = '${dParts[2].padLeft(2, '0')}/${dParts[1].padLeft(2, '0')}/${dParts[0]}';
              } else {
                finalDob = rawServerDob;
              }
            } else {
              finalDob = rawServerDob;
            }
          }

          final rawGender = data['gender']?.toString().trim() ?? '';
          String finalGender = _userProfile.gender;
          if (rawGender.toUpperCase().contains('NAM') || rawGender.toUpperCase() == 'MALE') {
            finalGender = 'Nam';
          } else if (rawGender.toUpperCase().contains('KHÁC') || rawGender.toUpperCase().contains('KHAC') || rawGender.toUpperCase() == 'OTHER') {
            finalGender = 'Khác';
          } else if (rawGender.isNotEmpty) {
            finalGender = 'Nữ';
          }

          final serverAddress = data['address']?.toString().trim() ?? '';
          final serverOcc = data['occupation']?.toString().trim() ?? '';
          final serverEmerName = data['emergencyContactName']?.toString().trim() ?? '';
          final serverEmerPhone = data['emergencyContactPhone']?.toString().trim() ?? '';
          final serverAvatar = data['avatarUrl']?.toString().trim() ?? '';

          _userProfile = _userProfile.copyWith(
            fullName: finalFullName,
            phone: finalPhone,
            isPhoneVerified: finalPhone.isNotEmpty,
            email: finalEmail,
            dateOfBirth: finalDob.isNotEmpty ? finalDob : _userProfile.dateOfBirth,
            gender: finalGender.isNotEmpty ? finalGender : _userProfile.gender,
            address: serverAddress.isNotEmpty ? serverAddress : _userProfile.address,
            occupation: serverOcc.isNotEmpty ? serverOcc : _userProfile.occupation,
            emergencyContactName: serverEmerName.isNotEmpty ? serverEmerName : _userProfile.emergencyContactName,
            emergencyContactPhone: serverEmerPhone.isNotEmpty ? serverEmerPhone : _userProfile.emergencyContactPhone,
            avatarUrl: serverAvatar.isNotEmpty ? serverAvatar : _userProfile.avatarUrl,
            memberTier: (data['memberTier']?.toString().isNotEmpty == true) ? data['memberTier'].toString() : _userProfile.memberTier,
            memberCode: (data['memberCode']?.toString().isNotEmpty == true) ? data['memberCode'].toString() : _userProfile.memberCode,
            studentCode: data['studentCode']?.toString() ?? _userProfile.studentCode,
            role: (data['role']?.toString().isNotEmpty == true) ? data['role'].toString() : _userProfile.role,
            points: (data['points'] as num?)?.toInt() ?? _userProfile.points,
            validUntil: (data['validUntil']?.toString().isNotEmpty == true) ? data['validUntil'].toString() : _userProfile.validUntil,
          );
          _persistLocalProfile(_userProfile);
          AuthService.instance.updateProfile(
            displayName: _userProfile.fullName,
            avatarUrl: _userProfile.avatarUrl,
            role: _userProfile.role,
          );
        }
      }
    } catch (e) {
      debugPrint('>>> [MembershipRepository] Error fetching profile: $e');
    }

    final lookupId = AuthService.instance.currentUserId;
    if (lookupPhone.isNotEmpty || lookupEmail.isNotEmpty || (lookupId != null && lookupId.isNotEmpty)) {
      try {
        final queryParam = (lookupId != null && lookupId.isNotEmpty && RegExp(r'^[0-9a-fA-F-]{36}$').hasMatch(lookupId))
            ? 'id=eq.$lookupId'
            : (lookupPhone.isNotEmpty ? 'phone=eq.$lookupPhone' : 'email=eq.$lookupEmail');

        dynamic sRes;
        try {
          sRes = await _apiClient.dio.get(
            '${ApiEndpoints.users}?$queryParam&select=id,full_name,phone,email,avatar_url,gender,date_of_birth,address,emergency_contact_name,emergency_contact_phone,membership_tier,reward_points,referral_code,student_code,role,referred_by_id,total_spent&limit=1',
            options: Options(
              headers: {
                'apikey': ApiEndpoints.supabaseAnonKey,
                'Authorization': 'Bearer ${ApiEndpoints.supabaseAnonKey}',
              },
            ),
          );
        } catch (_) {
          sRes = await _apiClient.dio.get(
            '${ApiEndpoints.users}?$queryParam&select=id,full_name,phone,email,avatar_url,gender,date_of_birth,address,emergency_contact_name,emergency_contact_phone,membership_tier,reward_points,referral_code,role,referred_by_id,total_spent&limit=1',
            options: Options(
              headers: {
                'apikey': ApiEndpoints.supabaseAnonKey,
                'Authorization': 'Bearer ${ApiEndpoints.supabaseAnonKey}',
              },
            ),
          );
        }

        if (sRes.statusCode == 200 && sRes.data is List && (sRes.data as List).isNotEmpty) {
          final u = (sRes.data as List).first as Map<String, dynamic>;
          final dbName = u['full_name']?.toString().trim() ?? '';
          final dbPhone = u['phone']?.toString().trim() ?? '';
          final dbEmail = u['email']?.toString().trim() ?? '';
          final dbAddress = u['address']?.toString().trim() ?? '';
          final dbAvatar = u['avatar_url']?.toString().trim() ?? '';
          final dbGender = u['gender']?.toString().trim() ?? '';
          final rawDob = u['date_of_birth']?.toString().trim() ?? '';
          String dbDob = '';
          if (rawDob.isNotEmpty) {
            try {
              final dParts = rawDob.split('-');
              if (dParts.length == 3) {
                dbDob = '${dParts[2]}/${dParts[1]}/${dParts[0]}';
              } else {
                dbDob = rawDob;
              }
            } catch (_) {
              dbDob = rawDob;
            }
          }
          final dbEmerName = u['emergency_contact_name']?.toString().trim() ?? '';
          final dbEmerPhone = u['emergency_contact_phone']?.toString().trim() ?? '';
          final dbCode = u['referral_code']?.toString().trim() ?? '';
          final dbStudentCode = u['student_code']?.toString().trim();
          final dbRole = u['role']?.toString().trim() ?? '';
          final dbPoints = (u['reward_points'] as num?)?.toInt();
          final dbTier = u['membership_tier']?.toString();
          final dbTotalSpent = (u['total_spent'] as num?)?.toDouble() ?? 0.0;

          // Đồng bộ thông tin người giới thiệu từ DB một cách an toàn không gây lỗi quan hệ
          final dbReferredById = u['referred_by_id']?.toString().trim();
          String? dbReferrerName;
          if (dbReferredById != null && dbReferredById.isNotEmpty) {
            try {
              final refRes = await _apiClient.dio.get(
                '${ApiEndpoints.users}?id=eq.$dbReferredById&select=full_name,role&limit=1',
                options: Options(
                  headers: {
                    'apikey': ApiEndpoints.supabaseAnonKey,
                    'Authorization': 'Bearer ${ApiEndpoints.supabaseAnonKey}',
                  },
                ),
              );
              if (refRes.data is List && (refRes.data as List).isNotEmpty) {
                final rData = (refRes.data as List).first as Map<String, dynamic>;
                final rName = rData['full_name']?.toString().trim() ?? '';
                final rRole = rData['role']?.toString().trim() ?? '';
                if (rName.isNotEmpty) {
                  if (rRole == 'INSTRUCTOR' || rRole == 'DOCTOR') {
                    dbReferrerName = '$rName (Chỉ định Y khoa)';
                  } else if (rRole == 'TECHNICIAN') {
                    dbReferrerName = '$rName (KTV Phục hồi)';
                  } else {
                    dbReferrerName = rName;
                  }
                }
              }
            } catch (_) {}
          }

          String displayGender = _userProfile.gender;
          if (dbGender == 'MALE') {
            displayGender = 'Nam';
          } else if (dbGender == 'FEMALE') {
            displayGender = 'Nữ';
          } else if (dbGender.isNotEmpty) {
            displayGender = dbGender;
          }

          final effectiveAvatar = dbAvatar.isNotEmpty
              ? dbAvatar
              : _userProfile.avatarUrl;

          _userProfile = _userProfile.copyWith(
            id: u['id']?.toString() ?? _userProfile.id,
            fullName: dbName.isNotEmpty ? dbName : _userProfile.fullName,
            phone: dbPhone.isNotEmpty ? dbPhone : _userProfile.phone,
            isPhoneVerified: dbPhone.isNotEmpty ? true : _userProfile.isPhoneVerified,
            email: dbEmail.isNotEmpty ? dbEmail : _userProfile.email,
            address: dbAddress.isNotEmpty ? dbAddress : _userProfile.address,
            avatarUrl: effectiveAvatar,
            gender: displayGender,
            dateOfBirth: dbDob.isNotEmpty ? dbDob : _userProfile.dateOfBirth,
            emergencyContactName: dbEmerName.isNotEmpty ? dbEmerName : _userProfile.emergencyContactName,
            emergencyContactPhone: dbEmerPhone.isNotEmpty ? dbEmerPhone : _userProfile.emergencyContactPhone,
            memberCode: dbCode.isNotEmpty ? dbCode : _userProfile.memberCode,
            studentCode: (dbStudentCode != null && dbStudentCode.isNotEmpty) ? dbStudentCode : _userProfile.studentCode,
            role: dbRole.isNotEmpty ? dbRole : _userProfile.role,
            points: dbPoints ?? _userProfile.points,
            memberTier: dbTier != null ? _mapTierName(dbTier) : _userProfile.memberTier,
            referrerName: dbReferrerName,
            referredById: dbReferredById,
            totalSpent: dbTotalSpent,
            clearReferrer: (dbReferrerName == null || dbReferrerName.isEmpty),
          );
          _persistLocalProfile(_userProfile);
          AuthService.instance.updateProfile(
            displayName: _userProfile.fullName,
            avatarUrl: effectiveAvatar,
            role: _userProfile.role,
          );
        }
      } catch (e) {
        debugPrint('>>> [MembershipRepository] Error querying Supabase users table: $e');
      }
    }
    return _userProfile;
  }

  /// Tải ảnh đại diện lên Supabase Storage (Bucket: avatars) và trả về Public URL vĩnh viễn
  Future<String?> uploadAvatarFile(String localPath) async {
    final cleanPath = localPath.trim();
    if (cleanPath.isEmpty) return null;
    if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
      return cleanPath;
    }

    try {
      final file = File(cleanPath);
      if (!file.existsSync()) {
        debugPrint('>>> [MembershipRepository] Avatar file does not exist locally: $cleanPath');
        return null;
      }

      final bytes = await file.readAsBytes();
      final ext = cleanPath.split('.').last.toLowerCase();
      final mimeType = (ext == 'png')
          ? 'image/png'
          : (ext == 'webp' ? 'image/webp' : 'image/jpeg');

      final userPhone = _userProfile.phone.replaceAll(RegExp(r'\D'), '');
      final userId = AuthService.instance.currentUserId ?? 'user';
      final fileName = 'avatar_${userPhone.isNotEmpty ? userPhone : userId}_${DateTime.now().millisecondsSinceEpoch}.${ext == 'png' ? 'png' : 'jpg'}';

      final uploadUrl = '${ApiEndpoints.supabaseUrl}/storage/v1/object/avatars/$fileName';

      final res = await _apiClient.dio.post(
        uploadUrl,
        data: bytes,
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.supabaseAnonKey}',
            'Content-Type': mimeType,
          },
        ),
      );

      if (res.statusCode == 200 || res.statusCode == 201) {
        final publicUrl = '${ApiEndpoints.supabaseUrl}/storage/v1/object/public/avatars/$fileName';
        debugPrint('>>> [MembershipRepository] Uploaded avatar to Supabase Storage: $publicUrl');
        return publicUrl;
      }
    } catch (e) {
      debugPrint('>>> [MembershipRepository] Error uploading avatar to Supabase: $e');
    }
    return null;
  }

  /// F02: Cập nhật thông tin hồ sơ lên Cơ Sở Dữ Liệu (Supabase & Backend)
  Future<bool> updateProfile(UserProfile updated) async {
    String finalAvatarUrl = updated.avatarUrl.trim();
    if (finalAvatarUrl.isNotEmpty &&
        !finalAvatarUrl.startsWith('http://') &&
        !finalAvatarUrl.startsWith('https://')) {
      final uploadedUrl = await uploadAvatarFile(finalAvatarUrl);
      if (uploadedUrl != null && uploadedUrl.isNotEmpty) {
        finalAvatarUrl = uploadedUrl;
      }
    }

    final effectivePhone = updated.phone.trim();
    final isVerified = updated.isPhoneVerified || effectivePhone.isNotEmpty;
    _userProfile = updated.copyWith(
      avatarUrl: finalAvatarUrl,
      phone: effectivePhone,
      isPhoneVerified: isVerified,
    );
    _persistLocalProfile(_userProfile);

    if (finalAvatarUrl.isNotEmpty) {
      AuthService.instance.updateProfile(avatarUrl: finalAvatarUrl);
    }

    if (updated.phone.trim().isNotEmpty) {
      AuthService.instance.updatePhone(updated.phone.trim());
    }

    if (!AuthService.instance.isAuthenticated || AuthService.instance.isGuest) {
      return true;
    }

    bool remoteSaved = false;

    try {
      final backendPayload = <String, dynamic>{
        'fullName': updated.fullName.trim().isNotEmpty ? updated.fullName.trim() : 'Khách hàng MLD',
        if (effectivePhone.isNotEmpty) 'phone': effectivePhone,
        if (updated.email.trim().isNotEmpty) 'email': updated.email.trim(),
        if (updated.dateOfBirth.trim().isNotEmpty) 'dateOfBirth': updated.dateOfBirth.trim(),
        'gender': updated.gender.isNotEmpty ? updated.gender : 'Nữ',
        'address': updated.address.trim(),
        'occupation': updated.occupation.trim(),
        'emergencyContactName': updated.emergencyContactName.trim(),
        'emergencyContactPhone': updated.emergencyContactPhone.trim(),
        if (finalAvatarUrl.isNotEmpty) 'avatarUrl': finalAvatarUrl,
      };

      final bRes = await _apiClient.dio.put(
        ApiEndpoints.membershipProfile,
        data: backendPayload,
      );
      if (bRes.statusCode == 200 || bRes.statusCode == 201) {
        remoteSaved = true;
        final bData = bRes.data is Map ? bRes.data['data'] : null;
        if (bData is Map<String, dynamic>) {
          _userProfile = _userProfile.copyWith(
            memberTier: (bData['memberTier']?.toString().isNotEmpty == true) ? bData['memberTier'].toString() : _userProfile.memberTier,
            memberCode: (bData['memberCode']?.toString().isNotEmpty == true) ? bData['memberCode'].toString() : _userProfile.memberCode,
            points: (bData['points'] as num?)?.toInt() ?? _userProfile.points,
          );
          _persistLocalProfile(_userProfile);
          AuthService.instance.updateProfile(
            displayName: _userProfile.fullName,
            avatarUrl: _userProfile.avatarUrl,
            role: _userProfile.role,
          );
        }
      }
    } catch (e) {
      debugPrint('>>> [MembershipRepository] Error updating profile to backend: $e');
    }

    try {
      final lookupPhone = _userProfile.phone.trim();
      final lookupEmail = _userProfile.email.trim();
      final lookupId = AuthService.instance.currentUserId;

      final queryParam = (lookupId != null && lookupId.isNotEmpty && RegExp(r'^[0-9a-fA-F-]{36}$').hasMatch(lookupId))
          ? 'id=eq.$lookupId'
          : (lookupPhone.isNotEmpty
              ? 'phone=eq.$lookupPhone'
              : (lookupEmail.isNotEmpty ? 'email=eq.$lookupEmail' : ''));

      if (queryParam.isNotEmpty) {
        final dbGender = updated.gender.toUpperCase().contains('NAM') || updated.gender.toUpperCase() == 'MALE'
            ? 'MALE'
            : (updated.gender.toUpperCase().contains('NỮ') || updated.gender.toUpperCase().contains('NU') || updated.gender.toUpperCase() == 'FEMALE'
                ? 'FEMALE'
                : 'OTHER');

        String? dbDob;
        if (updated.dateOfBirth.trim().isNotEmpty) {
          final parts = updated.dateOfBirth.trim().split('/');
          if (parts.length == 3) {
            dbDob = '${parts[2]}-${parts[1].padLeft(2, '0')}-${parts[0].padLeft(2, '0')}';
          } else {
            dbDob = updated.dateOfBirth.trim();
          }
        }

        final updateData = <String, dynamic>{
          if (updated.fullName.trim().isNotEmpty) 'full_name': updated.fullName.trim(),
          if (updated.phone.trim().isNotEmpty) 'phone': updated.phone.trim(),
          if (updated.email.trim().isNotEmpty) 'email': updated.email.trim(),
          if (finalAvatarUrl.isNotEmpty) 'avatar_url': finalAvatarUrl,
          'address': updated.address.trim(),
          'gender': dbGender,
          if (dbDob != null) 'date_of_birth': dbDob,
          'emergency_contact_name': updated.emergencyContactName.trim(),
          'emergency_contact_phone': updated.emergencyContactPhone.trim(),
          'updated_at': DateTime.now().toIso8601String(),
        };

        final sbRes = await _apiClient.dio.patch(
          '${ApiEndpoints.users}?$queryParam',
          data: updateData,
          options: Options(
            headers: {
              'apikey': ApiEndpoints.supabaseAnonKey,
              'Authorization': 'Bearer ${ApiEndpoints.supabaseAnonKey}',
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
          ),
        );
        if (sbRes.statusCode == 200 || sbRes.statusCode == 204) {
          remoteSaved = true;
        }
      }
    } catch (e) {
      debugPrint('>>> [MembershipRepository] Supabase direct fallback ignored: $e');
    }

    return remoteSaved;
  }

  Future<void> updateAvatar(String newAvatarUrl) async {
    String finalAvatar = newAvatarUrl.trim();
    if (finalAvatar.isNotEmpty &&
        !finalAvatar.startsWith('http://') &&
        !finalAvatar.startsWith('https://')) {
      final uploadedUrl = await uploadAvatarFile(finalAvatar);
      if (uploadedUrl != null && uploadedUrl.isNotEmpty) {
        finalAvatar = uploadedUrl;
      }
    }

    _userProfile = _userProfile.copyWith(avatarUrl: finalAvatar);
    _persistLocalProfile(_userProfile);
    if (finalAvatar.isNotEmpty) {
      AuthService.instance.updateProfile(avatarUrl: finalAvatar);
    }

    // Cập nhật Supabase users table
    try {
      final lookupPhone = _userProfile.phone.trim();
      final lookupEmail = _userProfile.email.trim();
      final lookupId = AuthService.instance.currentUserId;
      final queryParam = (lookupId != null && lookupId.isNotEmpty && RegExp(r'^[0-9a-fA-F-]{36}$').hasMatch(lookupId))
          ? 'id=eq.$lookupId'
          : (lookupPhone.isNotEmpty ? 'phone=eq.$lookupPhone' : (lookupEmail.isNotEmpty ? 'email=eq.$lookupEmail' : ''));

      if (queryParam.isNotEmpty) {
        await _apiClient.dio.patch(
          '${ApiEndpoints.users}?$queryParam',
          data: {
            'avatar_url': finalAvatar,
            'updated_at': DateTime.now().toIso8601String(),
          },
          options: Options(
            headers: {
              'apikey': ApiEndpoints.supabaseAnonKey,
              'Authorization': 'Bearer ${ApiEndpoints.supabaseAnonKey}',
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
          ),
        );
      }
    } catch (_) {}

    _apiClient.dio.put(
      ApiEndpoints.membershipProfile,
      data: {'avatarUrl': finalAvatar, 'fullName': _userProfile.fullName},
    ).then((_) {}, onError: (_) {});
  }

  void updateLocalPoints(int points) {
    _userProfile = _userProfile.copyWith(points: points);
    _persistLocalProfile(_userProfile);
  }

  /// F04: Lấy danh sách quy tắc hạng hội viên từ Supabase membership_tier_rules
  Future<List<TierRuleModel>> fetchTierRules() async {
    try {
      final res = await _apiClient.dio.get(
        '${ApiEndpoints.supabaseUrl}/rest/v1/membership_tier_rules',
        queryParameters: {'select': '*', 'order': 'min_accumulated_spent.asc'},
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.supabaseAnonKey}',
          },
        ),
      );
      if (res.statusCode == 200 && res.data is List && (res.data as List).isNotEmpty) {
        return (res.data as List)
            .map((item) => TierRuleModel.fromJson(item as Map<String, dynamic>))
            .toList();
      }
    } catch (e) {
      debugPrint('>>> [MembershipRepository] Error fetching tier rules: $e');
    }
    return const [
      TierRuleModel(tier: 'STANDARD', displayName: 'Hội viên Tiêu chuẩn', minSpent: 0, pointEarningRate: 1.0, discountPercent: 0, freeHeadSpaCount: 0, priorityBooking: false, description: 'Tích lũy 1% giá trị đơn hàng làm điểm thưởng.'),
      TierRuleModel(tier: 'SILVER', displayName: 'Hội viên Bạc', minSpent: 5000000, pointEarningRate: 1.5, discountPercent: 5.0, freeHeadSpaCount: 0, priorityBooking: false, description: 'Tích 1.5% điểm, giảm 5% dịch vụ lẻ.'),
      TierRuleModel(tier: 'GOLD', displayName: 'Hội viên Vàng', minSpent: 15000000, pointEarningRate: 2.0, discountPercent: 10.0, freeHeadSpaCount: 1, priorityBooking: true, description: 'Tích 2% điểm, giảm 10% dịch vụ, ưu tiên xếp lịch.'),
      TierRuleModel(tier: 'PLATINUM', displayName: 'Hội viên Bạch Kim', minSpent: 30000000, pointEarningRate: 3.0, discountPercent: 15.0, freeHeadSpaCount: 2, priorityBooking: true, description: 'Tích 3% điểm, giảm 15% dịch vụ, phòng VIP riêng.'),
      TierRuleModel(tier: 'DIAMOND', displayName: 'Hội viên Kim Cương', minSpent: 60000000, pointEarningRate: 5.0, discountPercent: 20.0, freeHeadSpaCount: 4, priorityBooking: true, description: 'Tích 5% điểm, giảm 20% dịch vụ, chuyên gia trưởng phục vụ.'),
    ];
  }

  bool _isValidUuid(String id) =>
      RegExp(r'^[0-9a-fA-F-]{36}$').hasMatch(id);

  Future<List<PointsTransaction>> fetchLoyaltyPoints() async {
    final userId = AuthService.instance.currentUserId ?? _userProfile.id;

    // 1. Thử lấy từ Backend Gateway
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
              return _pointHistory;
            }
          }
        }
      }
    } catch (e) {
      debugPrint('>>> [MembershipRepository] Backend loyalty points failed, falling back to direct Supabase: $e');
    }

    if (_isValidUuid(userId)) {
      try {
        // Cập nhật số dư điểm mới nhất từ users
        final uRes = await _apiClient.dio.get(
          '${ApiEndpoints.supabaseUrl}/rest/v1/users?id=eq.$userId&select=reward_points,total_spent,membership_tier&limit=1',
          options: Options(
            headers: {
              'apikey': ApiEndpoints.supabaseAnonKey,
              'Authorization': 'Bearer ${ApiEndpoints.supabaseAnonKey}',
            },
          ),
        );
        if (uRes.statusCode == 200 && uRes.data is List && (uRes.data as List).isNotEmpty) {
          final u = (uRes.data as List).first;
          final pts = (u['reward_points'] as num?)?.toInt();
          final spent = (u['total_spent'] as num?)?.toDouble();
          final tier = u['membership_tier']?.toString();
          if (pts != null || spent != null || tier != null) {
            _userProfile = _userProfile.copyWith(
              points: pts ?? _userProfile.points,
              totalSpent: spent ?? _userProfile.totalSpent,
              memberTier: tier != null ? _mapTierName(tier) : _userProfile.memberTier,
            );
            _persistLocalProfile(_userProfile);
          }
        }

        // Lấy lịch sử biến động từ point_transactions
        final txRes = await _apiClient.dio.get(
          '${ApiEndpoints.supabaseUrl}/rest/v1/point_transactions',
          queryParameters: {
            'user_id': 'eq.$userId',
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

        if (txRes.statusCode == 200 && txRes.data is List) {
          final list = <PointsTransaction>[];
          for (final item in (txRes.data as List)) {
            if (item is Map<String, dynamic>) {
              final ptsChange = (item['points_change'] as num?)?.toInt() ?? 0;
              final ptsFormatted = ptsChange >= 0 ? '+$ptsChange' : '$ptsChange';
              final createdAtStr = item['created_at']?.toString() ?? '';
              String formattedDate = 'Gần đây';
              if (createdAtStr.isNotEmpty) {
                try {
                  final dt = DateTime.parse(createdAtStr).toLocal();
                  formattedDate = '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
                } catch (_) {}
              }
              list.add(
                PointsTransaction(
                  id: item['id']?.toString() ?? 'pt-${DateTime.now().millisecondsSinceEpoch}',
                  type: ptsChange >= 0 ? 'EARN' : 'REDEEM',
                  title: item['description']?.toString() ?? (ptsChange >= 0 ? 'Tích điểm dịch vụ' : 'Đổi quà voucher'),
                  date: formattedDate,
                  branch: 'Chi nhánh Quận 3 — TP. Hồ Chí Minh',
                  points: ptsFormatted,
                ),
              );
            }
          }
          _pointHistory.clear();
          _pointHistory.addAll(list);
          return _pointHistory;
        }
      } catch (e) {
        debugPrint('>>> [MembershipRepository] Supabase direct point_transactions error: $e');
      }
    }

    if (!AuthService.instance.isAuthenticated || AuthService.instance.isGuest) {
      if (_pointHistory.isEmpty) {
        _pointHistory.addAll([
          const PointsTransaction(
            id: 'pt-01',
            type: 'EARN',
            title: 'Tích điểm trị liệu MLD chuyên sâu',
            date: '15/10/2026',
            branch: 'Chi nhánh Quận 3',
            points: '+150',
          ),
        ]);
      }
    } else {
      _pointHistory.clear();
    }
    return _pointHistory;
  }

  /// F04: Đổi điểm thưởng nhận voucher/quà (đồng bộ với Web Admin user_vouchers & point_transactions)
  Future<Map<String, dynamic>> redeemReward(RewardItem reward) async {
    final userId = AuthService.instance.currentUserId ?? _userProfile.id;
    if (userId.isEmpty) {
      return {'success': false, 'message': 'Vui lòng đăng nhập để đổi điểm thưởng.'};
    }

    if (_userProfile.points < reward.pointsRequired) {
      return {
        'success': false,
        'message': 'Bạn cần ${reward.pointsRequired} điểm nhưng hiện chỉ có ${_userProfile.points} điểm.',
      };
    }

    // 1. Thử qua Backend Gateway
    try {
      final res = await _apiClient.dio.post(
        ApiEndpoints.membershipPointsRedeem,
        data: {'code': reward.id},
      );
      if (res.statusCode == 200 && res.data != null) {
        final data = res.data['data'] ?? res.data;
        if (data is Map && data['currentPoints'] != null) {
          final pts = (data['currentPoints'] as num).toInt();
          _userProfile = _userProfile.copyWith(points: pts);
          _persistLocalProfile(_userProfile);
          AuthService.instance.updateProfile(
            displayName: _userProfile.fullName,
            avatarUrl: _userProfile.avatarUrl,
            role: _userProfile.role,
          );
        }
        await fetchLoyaltyPoints();
        await fetchVouchers();
        return {'success': true, 'message': 'Đổi voucher thành công! Voucher đã sẵn sàng trong Ví của bạn.'};
      }
    } catch (e) {
      debugPrint('>>> [MembershipRepository] Backend redeem failed, falling back to direct Supabase: $e');
    }

    if (!_isValidUuid(userId)) {
      return {'success': false, 'message': 'Vui lòng đăng nhập để đổi điểm thưởng.'};
    }

    try {
      int currentPoints = _userProfile.points;
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
        final u = (uRes.data as List).first;
        if (u['reward_points'] != null) {
          currentPoints = (u['reward_points'] as num).toInt();
        }
      }

      if (currentPoints < reward.pointsRequired) {
        return {
          'success': false,
          'message': 'Bạn cần ${reward.pointsRequired} điểm nhưng hiện chỉ có $currentPoints điểm.',
        };
      }

      final newPoints = currentPoints - reward.pointsRequired;

      // Cập nhật điểm người dùng
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

      // Ghi nhận biến động điểm
      await _apiClient.dio.post(
        '${ApiEndpoints.supabaseUrl}/rest/v1/point_transactions',
        data: {
          'user_id': userId,
          'points_change': -reward.pointsRequired,
          'balance_after': newPoints,
          'action_type': 'REDEEM_VOUCHER',
          'description': 'Đổi điểm: ${reward.title} (-${reward.pointsRequired} điểm)',
        },
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.supabaseAnonKey}',
          },
        ),
      );

      // Thêm voucher vào user_vouchers
      String couponId = '44444444-0001-0001-0001-000000000001';
      if (reward.id == 'rw-02' || reward.title.contains('20%')) {
        couponId = '44444444-0001-0001-0001-000000000002';
      }

      final expiryDate = DateTime.now().add(const Duration(days: 180)).toIso8601String();
      await _apiClient.dio.post(
        '${ApiEndpoints.supabaseUrl}/rest/v1/user_vouchers',
        data: {
          'user_id': userId,
          'coupon_id': couponId,
          'source_trigger': 'LOYALTY_REDEEM',
          'status': 'AVAILABLE',
          'claimed_at': DateTime.now().toIso8601String(),
          'expires_at': expiryDate,
        },
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.supabaseAnonKey}',
          },
        ),
      );

      _userProfile = _userProfile.copyWith(points: newPoints);
      _persistLocalProfile(_userProfile);
      await fetchLoyaltyPoints();
      await fetchVouchers();
      return {'success': true, 'message': 'Đổi voucher thành công! Voucher đã được lưu vào Ví Voucher của bạn.'};
    } catch (e) {
      debugPrint('>>> [MembershipRepository] Supabase direct redeem error: $e');
      return {'success': false, 'message': 'Không thể thực hiện đổi điểm: $e'};
    }
  }

  Future<List<VoucherItem>> fetchVouchers({String? filter}) async {
    final list = <VoucherItem>[];
    final userId = AuthService.instance.currentUserId ?? _userProfile.id;

    final Set<String> usedCouponIds = {};
    final Set<String> usedCouponCodes = {};

    if (_isValidUuid(userId)) {
      try {
        final res = await _apiClient.dio.get(
          '${ApiEndpoints.supabaseUrl}/rest/v1/user_vouchers',
          queryParameters: {
            'user_id': 'eq.$userId',
            'select': 'id,status,expires_at,claimed_at,coupons(*)',
            'order': 'claimed_at.desc',
          },
          options: Options(headers: {
            'apikey': ApiEndpoints.effectiveSupabaseAuthKey,
            'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
          }),
        );
        if (res.statusCode == 200 && res.data is List) {
          for (final item in res.data) {
            if (item is Map<String, dynamic>) {
              final c = item['coupons'] as Map<String, dynamic>?;
              final cid = c?['id']?.toString() ?? item['coupon_id']?.toString() ?? '';
              final ccode = (c?['code']?.toString() ?? '').toUpperCase();
              final status = item['status']?.toString() ?? 'AVAILABLE';

              if (status == 'USED') {
                if (cid.isNotEmpty) usedCouponIds.add(cid);
                if (ccode.isNotEmpty) usedCouponCodes.add(ccode);
              }

              final pct = (num.tryParse(c?['discount_percent']?.toString() ?? '0') ?? 0).toDouble();
              final amt = (num.tryParse(c?['discount_amount']?.toString() ?? '0') ?? 0).toDouble();
              final minOrder = (num.tryParse(c?['min_order_amount']?.toString() ?? '0') ?? 0).toDouble();
              final maxDisc = (num.tryParse(c?['max_discount']?.toString() ?? '0') ?? 0).toDouble();
              final banner = pct > 0 ? 'GIẢM ${pct.toInt()}%' : (amt > 0 ? 'GIẢM ${_formatVoucherAmount(amt)}' : 'ƯU ĐÃI');
              final rawExpiry = item['expires_at']?.toString() ?? c?['valid_to']?.toString() ?? '';
              final expiryFormatted = _formatExpiryDate(rawExpiry);

              list.add(
                VoucherItem(
                  id: item['id']?.toString() ?? 'vc-${DateTime.now().millisecondsSinceEpoch}',
                  couponId: cid.isNotEmpty ? cid : null,
                  userVoucherId: item['id']?.toString(),
                  title: c?['title']?.toString() ?? 'Ưu đãi dịch vụ MLD',
                  subtitle: ccode.isNotEmpty ? ccode : 'Đặc quyền hội viên',
                  discountBanner: banner,
                  description: c?['description']?.toString() ?? 'Áp dụng tại Chi nhánh MLD Vietnam.',
                  expiryDate: expiryFormatted,
                  code: ccode.isNotEmpty ? ccode : 'MLDVIP',
                  status: status,
                  statusText: status == 'AVAILABLE'
                      ? 'Có thể sử dụng'
                      : (status == 'USED' ? 'Đã sử dụng' : 'Đã hết hạn'),
                  discountPercent: pct,
                  discountAmount: amt,
                  minOrderAmount: minOrder,
                  maxDiscount: maxDisc > 0 ? maxDisc : null,
                ),
              );
            }
          }
        }
      } catch (e) {
        debugPrint('>>> [MembershipRepository] Error fetching user vouchers from Supabase: $e');
      }

      try {
        final bRes = await _apiClient.dio.get(
          '${ApiEndpoints.supabaseUrl}/rest/v1/bookings',
          queryParameters: {
            'customer_id': 'eq.$userId',
            'coupon_id': 'not.is.null',
            'status': 'neq.CANCELLED',
            'select': 'coupon_id',
          },
          options: Options(headers: {
            'apikey': ApiEndpoints.effectiveSupabaseAuthKey,
            'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
          }),
        );
        if (bRes.statusCode == 200 && bRes.data is List) {
          for (final b in bRes.data) {
            final cid = b['coupon_id']?.toString();
            if (cid != null && cid.isNotEmpty) {
              usedCouponIds.add(cid);
            }
          }
        }
      } catch (e) {
        debugPrint('>>> [MembershipRepository] Error fetching used coupons from bookings: $e');
      }
    }

    try {
      final resCoupons = await _apiClient.dio.get(
        '${ApiEndpoints.supabaseUrl}/rest/v1/coupons',
        queryParameters: {
          'is_active': 'eq.true',
          'select': '*',
          'order': 'created_at.desc',
        },
        options: Options(headers: {
          'apikey': ApiEndpoints.effectiveSupabaseAuthKey,
          'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
        }),
      );
      if (resCoupons.statusCode == 200 && resCoupons.data is List) {
        for (final item in resCoupons.data) {
          if (item is Map<String, dynamic>) {
            final cid = item['id']?.toString() ?? '';
            final code = (item['code']?.toString() ?? '').toUpperCase();

            if (list.any((v) => (v.couponId != null && v.couponId == cid) || v.code.toUpperCase() == code)) {
              continue;
            }

            final isAlreadyUsedByUser = usedCouponIds.contains(cid) || usedCouponCodes.contains(code);

            final validTo = item['valid_to'] != null ? DateTime.tryParse(item['valid_to'].toString()) : null;
            final isExpired = validTo != null && DateTime.now().isAfter(validTo);
            final usedCount = (item['used_count'] as num?)?.toInt() ?? 0;
            final usageLimit = (item['usage_limit'] as num?)?.toInt() ?? 0;
            final isLimitExceeded = usageLimit > 0 && usedCount >= usageLimit;

            String computedStatus = 'AVAILABLE';
            String computedStatusText = 'Có thể sử dụng';
            if (isAlreadyUsedByUser) {
              computedStatus = 'USED';
              computedStatusText = 'Đã sử dụng';
            } else if (isExpired) {
              computedStatus = 'EXPIRED';
              computedStatusText = 'Đã hết hạn';
            } else if (isLimitExceeded) {
              computedStatus = 'EXPIRED';
              computedStatusText = 'Đã hết lượt';
            }

            final pct = (num.tryParse(item['discount_percent']?.toString() ?? '0') ?? 0).toDouble();
            final amt = (num.tryParse(item['discount_amount']?.toString() ?? '0') ?? 0).toDouble();
            final minOrder = (num.tryParse(item['min_order_amount']?.toString() ?? '0') ?? 0).toDouble();
            final maxDisc = (num.tryParse(item['max_discount']?.toString() ?? '0') ?? 0).toDouble();
            final banner = pct > 0 ? 'GIẢM ${pct.toInt()}%' : (amt > 0 ? 'GIẢM ${_formatVoucherAmount(amt)}' : 'ƯU ĐÃI');
            final expiryFormatted = _formatExpiryDate(item['valid_to']?.toString() ?? '');

            list.add(
              VoucherItem(
                id: cid.isNotEmpty ? cid : 'cp-${DateTime.now().millisecondsSinceEpoch}',
                couponId: cid,
                userVoucherId: null,
                title: item['title']?.toString() ?? 'Ưu đãi dịch vụ MLD',
                subtitle: code,
                discountBanner: banner,
                description: item['description']?.toString() ?? 'Áp dụng cho mọi dịch vụ Spa hoặc Gói liệu trình.',
                expiryDate: expiryFormatted,
                code: code,
                status: computedStatus,
                statusText: computedStatusText,
                discountPercent: pct,
                discountAmount: amt,
                minOrderAmount: minOrder,
                maxDiscount: maxDisc > 0 ? maxDisc : null,
              ),
            );
          }
        }
      }
    } catch (e) {
      debugPrint('>>> [MembershipRepository] Error fetching public coupons: $e');
    }

    if (list.isEmpty) {
      list.addAll([
        const VoucherItem(
          id: 'vc-01',
          couponId: '44444444-0001-0001-0001-000000000001',
          title: 'Tặng 100.000đ cho khách hàng mới',
          subtitle: 'MLDCHAOXIN',
          discountBanner: 'GIẢM 100K',
          description: 'Áp dụng cho mọi dịch vụ Spa hoặc Gói liệu trình đầu tiên',
          expiryDate: '13/04/2027',
          code: 'MLDCHAOXIN',
          status: 'AVAILABLE',
          statusText: 'Có thể sử dụng',
          discountAmount: 100000,
          minOrderAmount: 300000,
        ),
        const VoucherItem(
          id: 'vc-02',
          couponId: '44444444-0001-0001-0001-000000000002',
          title: 'Ưu đãi 20% Dịch vụ Chăm sóc Da & Dưỡng sinh',
          subtitle: 'SPADAY20',
          discountBanner: 'GIẢM 20%',
          description: 'Giảm tối đa 150.000đ áp dụng từ thứ 2 đến thứ 5',
          expiryDate: '13/01/2027',
          code: 'SPADAY20',
          status: 'AVAILABLE',
          statusText: 'Có thể sử dụng',
          discountPercent: 20,
          maxDiscount: 150000,
          minOrderAmount: 400000,
        ),
      ]);
    }

    _vouchers.clear();
    _vouchers.addAll(list);

    if (filter != null && filter.isNotEmpty && filter != 'ALL') {
      return list.where((v) => v.status == filter).toList();
    }
    return List.unmodifiable(_vouchers);
  }

  String _formatVoucherAmount(double amt) {
    if (amt >= 1000000) {
      final val = amt / 1000000;
      return '${val.toStringAsFixed(val.truncateToDouble() == val ? 0 : 1)}TR';
    } else if (amt >= 1000) {
      return '${(amt / 1000).toStringAsFixed(0)}K';
    }
    return '${amt.toInt()}đ';
  }

  String _formatCurrency(double val) {
    return val.toInt().toString().replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (m) => '${m[1]}.',
    );
  }

  String _formatExpiryDate(String raw) {
    if (raw.isEmpty) return '31/12/2026';
    try {
      final dt = DateTime.parse(raw);
      final d = dt.day.toString().padLeft(2, '0');
      final m = dt.month.toString().padLeft(2, '0');
      final y = dt.year.toString();
      return '$d/$m/$y';
    } catch (_) {
      return raw;
    }
  }

  Future<VoucherValidationResult> validateVoucherCodeDetails(String code, {double? currentPrice}) async {
    final cleanCode = code.trim().toUpperCase();
    if (cleanCode.isEmpty) {
      return VoucherValidationResult.failure('Vui lòng nhập mã ưu đãi.');
    }

    try {
      final res = await _apiClient.dio.get(
        '${ApiEndpoints.supabaseUrl}/rest/v1/coupons',
        queryParameters: {
          'code': 'eq.$cleanCode',
          'select': '*',
          'limit': '1',
        },
        options: Options(headers: {
          'apikey': ApiEndpoints.effectiveSupabaseAuthKey,
          'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
        }),
      );

      if (res.statusCode != 200 || res.data is! List || (res.data as List).isEmpty) {
        return VoucherValidationResult.failure('Mã ưu đãi "$cleanCode" không tồn tại trên hệ thống.');
      }

      final item = (res.data as List).first as Map<String, dynamic>;
      final couponId = item['id']?.toString() ?? '';
      final isActive = item['is_active'] == true;
      if (!isActive) {
        return VoucherValidationResult.failure('Mã ưu đãi "$cleanCode" hiện đã tạm dừng áp dụng.');
      }

      if (item['valid_to'] != null) {
        final validTo = DateTime.tryParse(item['valid_to'].toString());
        if (validTo != null && DateTime.now().isAfter(validTo)) {
          return VoucherValidationResult.failure('Mã ưu đãi "$cleanCode" đã hết hạn sử dụng.');
        }
      }
      if (item['valid_from'] != null) {
        final validFrom = DateTime.tryParse(item['valid_from'].toString());
        if (validFrom != null && DateTime.now().isBefore(validFrom)) {
          return VoucherValidationResult.failure('Mã ưu đãi "$cleanCode" chưa đến thời gian áp dụng.');
        }
      }

      final usageLimit = (item['usage_limit'] as num?)?.toInt() ?? 0;
      final usedCount = (item['used_count'] as num?)?.toInt() ?? 0;
      if (usageLimit > 0 && usedCount >= usageLimit) {
        return VoucherValidationResult.failure('Mã ưu đãi "$cleanCode" đã hết lượt sử dụng trên hệ thống.');
      }

      final userId = AuthService.instance.currentUserId ?? _userProfile.id;
      String? userVoucherId;

      if (_isValidUuid(userId)) {
        try {
          final uvUsedRes = await _apiClient.dio.get(
            '${ApiEndpoints.supabaseUrl}/rest/v1/user_vouchers',
            queryParameters: {
              'user_id': 'eq.$userId',
              'coupon_id': 'eq.$couponId',
              'status': 'eq.USED',
              'select': 'id,used_at',
              'limit': '1',
            },
            options: Options(headers: {
              'apikey': ApiEndpoints.effectiveSupabaseAuthKey,
              'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
            }),
          );
          if (uvUsedRes.statusCode == 200 && uvUsedRes.data is List && (uvUsedRes.data as List).isNotEmpty) {
            return VoucherValidationResult.failure('Bạn đã sử dụng mã ưu đãi "$cleanCode" rồi. Mỗi khách hàng chỉ được áp dụng 1 lần.');
          }
        } catch (_) {}

        try {
          final bUsedRes = await _apiClient.dio.get(
            '${ApiEndpoints.supabaseUrl}/rest/v1/bookings',
            queryParameters: {
              'customer_id': 'eq.$userId',
              'coupon_id': 'eq.$couponId',
              'status': 'neq.CANCELLED',
              'select': 'id,booking_code',
              'limit': '1',
            },
            options: Options(headers: {
              'apikey': ApiEndpoints.effectiveSupabaseAuthKey,
              'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
            }),
          );
          if (bUsedRes.statusCode == 200 && bUsedRes.data is List && (bUsedRes.data as List).isNotEmpty) {
            return VoucherValidationResult.failure('Bạn đã sử dụng mã ưu đãi "$cleanCode" cho một lịch hẹn trước đó rồi. Mỗi khách hàng chỉ được áp dụng 1 lần.');
          }
        } catch (_) {}

        try {
          final uvAvailRes = await _apiClient.dio.get(
            '${ApiEndpoints.supabaseUrl}/rest/v1/user_vouchers',
            queryParameters: {
              'user_id': 'eq.$userId',
              'coupon_id': 'eq.$couponId',
              'status': 'eq.AVAILABLE',
              'select': 'id',
              'limit': '1',
            },
            options: Options(headers: {
              'apikey': ApiEndpoints.effectiveSupabaseAuthKey,
              'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
            }),
          );
          if (uvAvailRes.statusCode == 200 && uvAvailRes.data is List && (uvAvailRes.data as List).isNotEmpty) {
            userVoucherId = (uvAvailRes.data as List).first['id']?.toString();
          }
        } catch (_) {}
      }

      final pct = (num.tryParse(item['discount_percent']?.toString() ?? '0') ?? 0).toDouble();
      final amt = (num.tryParse(item['discount_amount']?.toString() ?? '0') ?? 0).toDouble();
      final minOrder = (num.tryParse(item['min_order_amount']?.toString() ?? '0') ?? 0).toDouble();
      final maxDisc = (num.tryParse(item['max_discount']?.toString() ?? '0') ?? 0).toDouble();
      final banner = pct > 0 ? 'GIẢM ${pct.toInt()}%' : (amt > 0 ? 'GIẢM ${_formatVoucherAmount(amt)}' : 'ƯU ĐÃI');
      final expiry = _formatExpiryDate(item['valid_to']?.toString() ?? '');

      final voucher = VoucherItem(
        id: couponId.isNotEmpty ? couponId : 'cp-$cleanCode',
        couponId: couponId,
        userVoucherId: userVoucherId,
        title: item['title']?.toString() ?? 'Ưu đãi dịch vụ MLD',
        subtitle: cleanCode,
        discountBanner: banner,
        description: item['description']?.toString() ?? 'Áp dụng cho mọi dịch vụ Spa hoặc Gói liệu trình.',
        expiryDate: expiry,
        code: cleanCode,
        status: 'AVAILABLE',
        statusText: 'Có thể sử dụng',
        discountPercent: pct,
        discountAmount: amt,
        minOrderAmount: minOrder,
        maxDiscount: maxDisc > 0 ? maxDisc : null,
      );

      if (currentPrice != null && currentPrice > 0) {
        if (!voucher.isEligible(currentPrice)) {
          return VoucherValidationResult.failure('Đơn hàng chưa đạt mức tối thiểu ${_formatCurrency(minOrder)}đ để áp dụng mã này.');
        }
        final calculatedDiscount = voucher.calculateDiscount(currentPrice);
        return VoucherValidationResult.success(
          voucher: voucher,
          discount: calculatedDiscount,
          message: 'Áp dụng mã $cleanCode thành công! Tiết kiệm ${_formatCurrency(calculatedDiscount)}đ',
        );
      }

      return VoucherValidationResult.success(
        voucher: voucher,
        message: 'Mã ưu đãi $cleanCode hợp lệ và có thể sử dụng.',
      );
    } catch (e) {
      debugPrint('>>> [validateVoucherCodeDetails] Error: $e');
      return VoucherValidationResult.failure('Không thể kiểm tra mã ưu đãi: $e');
    }
  }

  Future<VoucherItem?> validateVoucherCode(String code) async {
    final result = await validateVoucherCodeDetails(code);
    return result.isValid ? result.voucher : null;
  }

  Future<Map<String, dynamic>> claimVoucherByCode(String code) async {
    final cleanCode = code.trim().toUpperCase();
    if (cleanCode.isEmpty) {
      return {'success': false, 'message': 'Vui lòng nhập mã voucher'};
    }

    final userId = AuthService.instance.currentUserId ?? _userProfile.id;
    if (!_isValidUuid(userId)) {
      return {'success': false, 'message': 'Vui lòng đăng nhập để lưu voucher'};
    }

    try {
      final res = await _apiClient.dio.get(
        '${ApiEndpoints.supabaseUrl}/rest/v1/coupons',
        queryParameters: {
          'code': 'eq.$cleanCode',
          'is_active': 'eq.true',
          'select': '*',
        },
        options: Options(headers: {
          'apikey': ApiEndpoints.effectiveSupabaseAuthKey,
          'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
        }),
      );

      if (res.statusCode != 200 || res.data is! List || (res.data as List).isEmpty) {
        return {'success': false, 'message': 'Mã voucher không tồn tại hoặc đã hết hạn'};
      }

      final coupon = (res.data as List).first as Map<String, dynamic>;
      final couponId = coupon['id']?.toString() ?? '';

      final existingRes = await _apiClient.dio.get(
        '${ApiEndpoints.supabaseUrl}/rest/v1/user_vouchers',
        queryParameters: {
          'user_id': 'eq.$userId',
          'coupon_id': 'eq.$couponId',
          'select': 'id,status',
        },
        options: Options(headers: {
          'apikey': ApiEndpoints.effectiveSupabaseAuthKey,
          'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
        }),
      );

      if (existingRes.statusCode == 200 && existingRes.data is List && (existingRes.data as List).isNotEmpty) {
        final existingStatus = (existingRes.data as List).first['status']?.toString();
        if (existingStatus == 'USED') {
          return {'success': false, 'message': 'Bạn đã sử dụng mã ưu đãi này rồi. Mỗi khách hàng chỉ được áp dụng 1 lần.'};
        }
        return {'success': true, 'message': 'Bạn đã lưu mã này trong ví voucher rồi!'};
      }

      final bCheck = await _apiClient.dio.get(
        '${ApiEndpoints.supabaseUrl}/rest/v1/bookings',
        queryParameters: {
          'customer_id': 'eq.$userId',
          'coupon_id': 'eq.$couponId',
          'status': 'neq.CANCELLED',
          'select': 'id',
          'limit': '1',
        },
        options: Options(headers: {
          'apikey': ApiEndpoints.effectiveSupabaseAuthKey,
          'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
        }),
      );
      if (bCheck.statusCode == 200 && bCheck.data is List && (bCheck.data as List).isNotEmpty) {
        return {'success': false, 'message': 'Bạn đã sử dụng mã ưu đãi này cho một lịch hẹn trước đó rồi.'};
      }

      // 3. Insert vào user_vouchers
      final expiresAt = coupon['valid_to']?.toString() ??
          DateTime.now().add(const Duration(days: 60)).toIso8601String();

      await _apiClient.dio.post(
        '${ApiEndpoints.supabaseUrl}/rest/v1/user_vouchers',
        data: {
          'user_id': userId,
          'coupon_id': couponId,
          'status': 'AVAILABLE',
          'source_trigger': 'PUBLIC_CLAIM',
          'expires_at': expiresAt,
        },
        options: Options(headers: {
          'apikey': ApiEndpoints.effectiveSupabaseAuthKey,
          'Authorization': 'Bearer ${ApiEndpoints.effectiveSupabaseAuthKey}',
          'Prefer': 'return=representation',
        }),
      );

      await fetchVouchers();
      return {'success': true, 'message': 'Lưu mã voucher thành công vào ví!'};
    } catch (e) {
      debugPrint('[MembershipRepository] claimVoucherByCode error: $e');
      return {'success': false, 'message': 'Không thể nhận voucher lúc này. Vui lòng thử lại sau.'};
    }
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
    if (_referralHistory.isEmpty) {
      _referralHistory.addAll([
        const ReferralRecord(
          id: 'ref-01',
          maskedName: 'Nguyễn V***',
          date: '10/10/2026',
          status: 'ELIGIBLE',
          statusText: 'Đủ điều kiện',
          points: '+100',
          recordedDate: '10/10/2026',
        ),
      ]);
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
      if (p.avatarUrl.trim().isNotEmpty) {
        prefs.setString(_avatarPrefKey, p.avatarUrl.trim());
        prefs.setString('user_avatar_path', p.avatarUrl.trim());
      } else {
        prefs.remove(_avatarPrefKey);
        prefs.remove('user_avatar_path');
      }
      prefs.setString(_namePrefKey, p.fullName);
      prefs.setString(_phonePrefKey, p.phone);
      prefs.setString(_emailPrefKey, p.email);
      prefs.setString(_addressPrefKey, p.address);
      prefs.setString(_dobPrefKey, p.dateOfBirth);
      prefs.setString(_genderPrefKey, p.gender);
      prefs.setString(_occupationPrefKey, p.occupation);
      prefs.setString(_emergencyNamePrefKey, p.emergencyContactName);
      prefs.setString(_emergencyPhonePrefKey, p.emergencyContactPhone);
      if (p.memberCode.isNotEmpty) {
        prefs.setString(_memberCodePrefKey, p.memberCode);
      }
      if (p.referrerName != null && p.referrerName!.isNotEmpty) {
        prefs.setString(_referrerNamePrefKey, p.referrerName!);
      } else {
        prefs.remove(_referrerNamePrefKey);
      }
      if (p.referredById != null && p.referredById!.isNotEmpty) {
        prefs.setString(_referredByIdPrefKey, p.referredById!);
      } else {
        prefs.remove(_referredByIdPrefKey);
      }
    }).catchError((_) {});
  }

  /// Liên kết mã người giới thiệu trực tiếp lên Supabase users
  Future<Map<String, dynamic>> linkReferralCode(String code) async {
    final cleanCode = code.trim().toUpperCase();
    if (cleanCode.isEmpty) {
      return {'success': false, 'message': 'Vui lòng nhập mã giới thiệu'};
    }
    final myId = AuthService.instance.currentUserId ?? _userProfile.id;
    if (myId.isEmpty) {
      return {'success': false, 'message': 'Vui lòng đăng nhập để liên kết mã'};
    }

    // 1. Ưu tiên gọi qua Backend NestJS (/api/v1/membership/referral/link)
    try {
      final bRes = await _apiClient.dio.post(
        ApiEndpoints.membershipReferralLink,
        data: {'referralCode': cleanCode},
      );
      if (bRes.statusCode == 200 || bRes.statusCode == 201) {
        final bData = bRes.data is Map ? bRes.data['data'] : null;
        final rName = bData?['referrerName']?.toString() ?? 'Người giới thiệu';
        final rId = bData?['referrerId']?.toString();
        _userProfile = _userProfile.copyWith(
          referrerName: rName,
          referredById: rId,
        );
        _persistLocalProfile(_userProfile);
        return {
          'success': true,
          'message': bRes.data['message'] ?? 'Đã liên kết người giới thiệu',
          'referrerName': rName,
        };
      }
    } catch (e) {
      debugPrint('>>> [MembershipRepository] Backend linkReferral error: $e');
    }

    // 2. Dự phòng trực tiếp Supabase REST với anon key
    try {
      final findRes = await _apiClient.dio.get(
        '${ApiEndpoints.users}?referral_code=eq.$cleanCode&select=id,full_name,role&limit=1',
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.supabaseAnonKey}',
          },
        ),
      );

      if (findRes.statusCode == 200 && findRes.data is List && (findRes.data as List).isNotEmpty) {
        final referrer = (findRes.data as List).first as Map<String, dynamic>;
        final referrerId = referrer['id']?.toString();
        final referrerName = referrer['full_name']?.toString() ?? '';
        final referrerRole = referrer['role']?.toString() ?? '';

        if (referrerId == myId) {
          return {'success': false, 'message': 'Không thể nhập mã của chính bạn'};
        }

        await _apiClient.dio.patch(
          '${ApiEndpoints.users}?id=eq.$myId',
          data: {'referred_by_id': referrerId},
          options: Options(
            headers: {
              'apikey': ApiEndpoints.supabaseAnonKey,
              'Authorization': 'Bearer ${ApiEndpoints.supabaseAnonKey}',
            },
          ),
        );

        String displayRole = referrerRole == 'INSTRUCTOR' ? ' (Chỉ định Y khoa)' : (referrerRole == 'TECHNICIAN' ? ' (KTV Phục hồi)' : '');
        final fullNameFormatted = '$referrerName$displayRole';

        _userProfile = _userProfile.copyWith(
          referrerName: fullNameFormatted,
          referredById: referrerId,
        );
        _persistLocalProfile(_userProfile);

        return {
          'success': true,
          'message': 'Đã liên kết người giới thiệu: $referrerName',
          'referrerName': fullNameFormatted,
        };
      } else {
        return {'success': false, 'message': 'Mã giới thiệu không tồn tại trên hệ thống'};
      }
    } catch (e) {
      return {'success': false, 'message': 'Lỗi khi liên kết mã: $e'};
    }
  }

  /// Gỡ bỏ người giới thiệu (cho về null / 0)
  Future<bool> clearReferral() async {
    final myId = AuthService.instance.currentUserId ?? _userProfile.id;
    if (myId.isEmpty) return false;

    // 1. Ưu tiên gọi Backend NestJS (/api/v1/membership/referral)
    try {
      final bRes = await _apiClient.dio.delete(ApiEndpoints.membershipReferral);
      if (bRes.statusCode == 200 || bRes.statusCode == 204) {
        _userProfile = _userProfile.copyWith(clearReferrer: true);
        _persistLocalProfile(_userProfile);
        return true;
      }
    } catch (_) {}

    // 2. Dự phòng Supabase REST với anon key
    try {
      await _apiClient.dio.patch(
        '${ApiEndpoints.users}?id=eq.$myId',
        data: {'referred_by_id': null},
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseAnonKey,
            'Authorization': 'Bearer ${ApiEndpoints.supabaseAnonKey}',
          },
        ),
      );
      _userProfile = _userProfile.copyWith(clearReferrer: true);
      _persistLocalProfile(_userProfile);
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Reset profile state to clean guest state on logout
  void resetProfile() {
    _userProfile = const UserProfile(
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
      referrerName: null,
      referredById: null,
    );
    _pointHistory.clear();
    _vouchers.clear();
    _payments.clear();
    _referralHistory.clear();
    _clearLocalProfile();
  }

  void _clearLocalProfile() {
    SharedPreferences.getInstance().then((prefs) {
      prefs.remove(_avatarPrefKey);
      prefs.remove('user_avatar_path');
      prefs.remove(_namePrefKey);
      prefs.remove(_phonePrefKey);
      prefs.remove(_emailPrefKey);
      prefs.remove(_addressPrefKey);
      prefs.remove(_dobPrefKey);
      prefs.remove(_genderPrefKey);
      prefs.remove(_occupationPrefKey);
      prefs.remove(_emergencyNamePrefKey);
      prefs.remove(_emergencyPhonePrefKey);
      prefs.remove(_memberCodePrefKey);
      prefs.remove(_referrerNamePrefKey);
      prefs.remove(_referredByIdPrefKey);
    }).catchError((_) {});
  }
}
