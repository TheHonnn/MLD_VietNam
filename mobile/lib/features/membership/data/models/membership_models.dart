class UserProfile {
  final String id;
  final String fullName;
  final String phone;
  final bool isPhoneVerified;
  final String email;
  final String dateOfBirth;
  final String gender;
  final String address;
  final String occupation;
  final String emergencyContactName;
  final String emergencyContactPhone;
  final String avatarUrl;
  final String memberTier;
  final String memberCode;
  final int points;
  final String validUntil;
  final String? referrerName;
  final String? referredById;
  final double totalSpent;

  const UserProfile({
    required this.id,
    required this.fullName,
    required this.phone,
    required this.isPhoneVerified,
    required this.email,
    required this.dateOfBirth,
    required this.gender,
    required this.address,
    required this.occupation,
    required this.emergencyContactName,
    required this.emergencyContactPhone,
    required this.avatarUrl,
    required this.memberTier,
    required this.memberCode,
    required this.points,
    required this.validUntil,
    this.referrerName,
    this.referredById,
    this.totalSpent = 0.0,
  });

  UserProfile copyWith({
    String? id,
    String? fullName,
    String? phone,
    bool? isPhoneVerified,
    String? email,
    String? dateOfBirth,
    String? gender,
    String? address,
    String? occupation,
    String? emergencyContactName,
    String? emergencyContactPhone,
    String? avatarUrl,
    String? memberTier,
    String? memberCode,
    int? points,
    String? validUntil,
    String? referrerName,
    String? referredById,
    double? totalSpent,
    bool clearReferrer = false,
  }) {
    return UserProfile(
      id: id ?? this.id,
      fullName: fullName ?? this.fullName,
      phone: phone ?? this.phone,
      isPhoneVerified: isPhoneVerified ?? this.isPhoneVerified,
      email: email ?? this.email,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      gender: gender ?? this.gender,
      address: address ?? this.address,
      occupation: occupation ?? this.occupation,
      emergencyContactName: emergencyContactName ?? this.emergencyContactName,
      emergencyContactPhone: emergencyContactPhone ?? this.emergencyContactPhone,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      memberTier: memberTier ?? this.memberTier,
      memberCode: memberCode ?? this.memberCode,
      points: points ?? this.points,
      validUntil: validUntil ?? this.validUntil,
      referrerName: clearReferrer ? null : (referrerName ?? this.referrerName),
      referredById: clearReferrer ? null : (referredById ?? this.referredById),
      totalSpent: totalSpent ?? this.totalSpent,
    );
  }
}

class MembershipPerk {
  final String icon;
  final String title;
  final String description;

  const MembershipPerk({
    required this.icon,
    required this.title,
    required this.description,
  });
}

class MembershipTier {
  final String name;
  final int minPoints;
  final bool isCurrent;

  const MembershipTier({
    required this.name,
    required this.minPoints,
    required this.isCurrent,
  });
}

/// Quy tắc & Đặc quyền từng hạng hội viên (đồng bộ với Web Admin: membership_tier_rules)
class TierRuleModel {
  final String tier; // 'STANDARD', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'
  final String displayName;
  final double minSpent;
  final double pointEarningRate;
  final double discountPercent;
  final int freeHeadSpaCount;
  final bool priorityBooking;
  final String description;

  const TierRuleModel({
    required this.tier,
    required this.displayName,
    required this.minSpent,
    required this.pointEarningRate,
    required this.discountPercent,
    required this.freeHeadSpaCount,
    required this.priorityBooking,
    required this.description,
  });

  factory TierRuleModel.fromJson(Map<String, dynamic> json) {
    final t = json['tier']?.toString().toUpperCase() ?? 'STANDARD';
    String dName = 'Hội viên Tiêu chuẩn';
    if (t == 'SILVER') dName = 'Hội viên Bạc';
    if (t == 'GOLD') dName = 'Hội viên Vàng';
    if (t == 'PLATINUM') dName = 'Hội viên Bạch Kim';
    if (t == 'DIAMOND') dName = 'Hội viên Kim Cương';

    return TierRuleModel(
      tier: t,
      displayName: dName,
      minSpent: (json['min_accumulated_spent'] as num?)?.toDouble() ?? 0.0,
      pointEarningRate: (json['point_earning_rate'] as num?)?.toDouble() ?? 1.0,
      discountPercent: (json['discount_service_percent'] as num?)?.toDouble() ?? 0.0,
      freeHeadSpaCount: (json['free_head_spa_sessions'] as num?)?.toInt() ?? 0,
      priorityBooking: json['priority_booking'] == true,
      description: json['description']?.toString() ?? '',
    );
  }
}

class PointsTransaction {
  final String id;
  final String type; // 'EARN' | 'REDEEM'
  final String title;
  final String date;
  final String branch;
  final String points;

  const PointsTransaction({
    required this.id,
    required this.type,
    required this.title,
    required this.date,
    required this.branch,
    required this.points,
  });
}

class RewardItem {
  final String id;
  final String title;
  final int pointsRequired;
  final String condition;

  const RewardItem({
    required this.id,
    required this.title,
    required this.pointsRequired,
    required this.condition,
  });
}

class VoucherItem {
  final String id;
  final String title;
  final String subtitle;
  final String discountBanner;
  final String description;
  final String expiryDate;
  final String code;
  final String status;
  final String statusText;

  const VoucherItem({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.discountBanner,
    required this.description,
    required this.expiryDate,
    required this.code,
    required this.status,
    required this.statusText,
  });
}

class PaymentTransaction {
  final String id;
  final String code;
  final String date;
  final String type; // 'Dịch vụ' | 'Liệu trình' | 'Học phí'
  final String icon; // 'receipt' | 'graduation-cap'
  final String serviceName;
  final String branch;
  final int amount;
  final String amountFormatted;
  final String status;
  final String statusLabel;
  final String paymentMethod;
  final int refundAmount;
  final int remainingAmount;

  const PaymentTransaction({
    required this.id,
    required this.code,
    required this.date,
    required this.type,
    required this.icon,
    required this.serviceName,
    required this.branch,
    required this.amount,
    required this.amountFormatted,
    required this.status,
    required this.statusLabel,
    required this.paymentMethod,
    required this.refundAmount,
    required this.remainingAmount,
  });
}

class ReferralRecord {
  final String id;
  final String maskedName;
  final String date;
  final String status; // 'ELIGIBLE' | 'PENDING'
  final String statusText;
  final String points;
  final String recordedDate;

  const ReferralRecord({
    required this.id,
    required this.maskedName,
    required this.date,
    required this.status,
    required this.statusText,
    required this.points,
    required this.recordedDate,
  });
}

class UserSettings {
  final bool notifyAppointments;
  final bool notifyTreatments;
  final bool notifyCourses;
  final bool notifyPromotions;
  final String language;
  final String preferredBranch;
  final String theme;
  final String version;

  const UserSettings({
    required this.notifyAppointments,
    required this.notifyTreatments,
    required this.notifyCourses,
    required this.notifyPromotions,
    required this.language,
    required this.preferredBranch,
    required this.theme,
    required this.version,
  });

  UserSettings copyWith({
    bool? notifyAppointments,
    bool? notifyTreatments,
    bool? notifyCourses,
    bool? notifyPromotions,
    String? language,
    String? preferredBranch,
    String? theme,
    String? version,
  }) {
    return UserSettings(
      notifyAppointments: notifyAppointments ?? this.notifyAppointments,
      notifyTreatments: notifyTreatments ?? this.notifyTreatments,
      notifyCourses: notifyCourses ?? this.notifyCourses,
      notifyPromotions: notifyPromotions ?? this.notifyPromotions,
      language: language ?? this.language,
      preferredBranch: preferredBranch ?? this.preferredBranch,
      theme: theme ?? this.theme,
      version: version ?? this.version,
    );
  }
}

