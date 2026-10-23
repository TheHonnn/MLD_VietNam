// ==============================================================================
// MLD VIỆT NAM - HOME & DIRECTORY DATA MODELS
// Chuẩn hóa 100% theo nghiệp vụ Chăm sóc sắc đẹp, Spa dưỡng sinh & Đào tạo nghề
// ==============================================================================

/// 1. Banner Khuyến mãi / Tin tức nổi bật
class BannerPromoModel {
  final String id;
  final String title;
  final String subtitle;
  final String tag;
  final String ctaText;
  final String imageUrl;

  const BannerPromoModel({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.tag,
    required this.ctaText,
    required this.imageUrl,
  });
}

/// 2. Gói Liệu trình Định kỳ (Treatment Package)
class TreatmentPackageModel {
  final String id;
  final String title;
  final String category;
  final double price;
  final double originalPrice;
  final String duration;
  final int sessionsCount;
  final double rating;
  final String imageUrl;
  final String badgeText;
  final String description;
  final List<String> features;
  final int validityMonths;

  const TreatmentPackageModel({
    required this.id,
    required this.title,
    required this.category,
    required this.price,
    this.originalPrice = 0.0,
    required this.duration,
    required this.sessionsCount,
    this.rating = 5.0,
    required this.imageUrl,
    this.badgeText = 'Ưu đãi',
    this.description = '',
    this.features = const [],
    this.validityMonths = 6,
  });

  String get durationText => duration;
  int get totalSessions => sessionsCount;
}

/// 3. Kỹ thuật viên / Chuyên viên Spa (Technician & Chuyên gia)
class TechnicianModel {
  final String id;
  final String name;
  final String title;
  final String speciality;
  final String clinicName;
  final int experienceYears;
  final double rating;
  final int reviewCount;
  final double consultationFee;
  final String avatarUrl;
  final bool isAvailableToday;
  final String bio;
  final List<String> specialties;

  const TechnicianModel({
    required this.id,
    required this.name,
    required this.title,
    this.speciality = 'Chăm sóc da & Dưỡng sinh',
    this.clinicName = 'MLD Beauty & Spa',
    required this.experienceYears,
    required this.rating,
    required this.reviewCount,
    this.consultationFee = 300000.0,
    required this.avatarUrl,
    this.isAvailableToday = true,
    this.bio = '',
    this.specialties = const ['Chăm sóc da', 'Massage dưỡng sinh'],
  });

  String get branchName => clinicName;

  factory TechnicianModel.fromJson(Map<String, dynamic> json) {
    String clinic = 'MLD Beauty & Spa';
    if (json['branches'] != null && json['branches'] is Map) {
      clinic = json['branches']['name'] as String? ?? clinic;
    } else if (json['clinicName'] != null) {
      clinic = json['clinicName'] as String;
    }

    List<String> specs = const ['Chăm sóc da', 'Massage dưỡng sinh'];
    if (json['specialties'] != null && json['specialties'] is List) {
      specs = (json['specialties'] as List).map((e) => e.toString()).toList();
    }

    return TechnicianModel(
      id: json['id']?.toString() ?? '',
      name: json['full_name'] as String? ?? json['name'] as String? ?? 'Chuyên viên MLD',
      title: json['title'] as String? ?? 'Kỹ thuật viên trị liệu',
      speciality: specs.isNotEmpty ? specs.first : 'Chăm sóc da & Dưỡng sinh',
      clinicName: clinic,
      experienceYears: (json['experience_years'] as num?)?.toInt() ?? 3,
      rating: (json['rating_avg'] as num?)?.toDouble() ?? (json['rating'] as num?)?.toDouble() ?? 5.0,
      reviewCount: (json['review_count'] as num?)?.toInt() ?? 0,
      consultationFee: (json['consultation_fee'] as num?)?.toDouble() ?? 300000.0,
      avatarUrl: json['avatar_url'] as String? ?? json['avatar'] as String? ?? 'assets/images/specialist_avatar_1.png',
      isAvailableToday: json['is_active'] as bool? ?? json['isAvailableToday'] as bool? ?? true,
      bio: json['bio'] as String? ?? '',
      specialties: specs,
    );
  }
}

/// 4. Chi nhánh Cơ sở Spa MLD (Branch)
class BranchModel {
  final String id;
  final String name;
  final String phone;
  final String address;
  final String city;
  final double distanceKm;
  final String openingHours;
  final double rating;
  final String imageUrl;
  final List<String> services;
  final String district;
  final List<String> amenities;
  final int totalRooms;
  final int totalBeds;

  const BranchModel({
    required this.id,
    required this.name,
    required this.phone,
    required this.address,
    required this.city,
    required this.distanceKm,
    required this.openingHours,
    required this.rating,
    required this.imageUrl,
    required this.services,
    this.district = 'Quận 3',
    this.amenities = const ['Phòng VIP', 'Máy soi da 3D', 'Trà thảo mộc'],
    this.totalRooms = 8,
    this.totalBeds = 16,
  });

  factory BranchModel.fromJson(Map<String, dynamic> json) {
    final opening = (json['opening_time'] != null && json['closing_time'] != null)
        ? '${json['opening_time']} - ${json['closing_time']}'
        : '08:30 - 21:00';
    final district = json['district']?.toString() ?? 'Quận 3';
    final city = json['city']?.toString() ?? 'TP. Hồ Chí Minh';
    return BranchModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'MLD Spa',
      phone: json['phone']?.toString() ?? '0901 234 567',
      address: json['address']?.toString() ?? '',
      city: city,
      district: district,
      distanceKm: (json['distance_km'] as num?)?.toDouble() ?? 1.2,
      openingHours: opening,
      rating: (json['rating'] as num?)?.toDouble() ?? 4.9,
      imageUrl: json['image_url']?.toString() ?? 'assets/images/gioithieu_1.png',
      services: const ['Massage', 'Chăm sóc da', 'Chăm sóc cơ thể', 'Chăm sóc sức khỏe', 'Gói liệu trình'],
      amenities: (json['amenities'] is List)
          ? (json['amenities'] as List).map((e) => e.toString()).toList()
          : const ['Phòng VIP', 'Máy soi da 3D', 'Trà thảo mộc'],
      totalRooms: (json['total_rooms'] as num?)?.toInt() ?? 8,
      totalBeds: (json['total_beds'] as num?)?.toInt() ?? 16,
    );
  }
}

/// 5. Dịch vụ Spa & Làm đẹp Chi tiết (Mới)
class SpaServiceModel {
  final String id;
  final String name;
  final String categoryName;
  final String shortDescription;
  final String fullDescription;
  final int durationMinutes;
  final double price;
  final double? discountPrice;
  final String imageUrl;
  final List<String> steps;
  final List<String> benefits;
  final bool isFeatured;

  const SpaServiceModel({
    required this.id,
    required this.name,
    required this.categoryName,
    required this.shortDescription,
    this.fullDescription = '',
    required this.durationMinutes,
    required this.price,
    this.discountPrice,
    required this.imageUrl,
    this.steps = const [],
    this.benefits = const [],
    this.isFeatured = false,
  });

  double get displayPrice => discountPrice ?? price;
  bool get hasDiscount => discountPrice != null && discountPrice! > 0 && discountPrice! < price;
  int get discountPercent => hasDiscount ? (((price - discountPrice!) / price) * 100).round() : 0;
  String get description => shortDescription.isNotEmpty ? shortDescription : fullDescription;
  String get category => categoryName;

  factory SpaServiceModel.fromJson(Map<String, dynamic> json) {
    String category = 'Massage thư giãn';
    if (json['service_categories'] != null && json['service_categories'] is Map) {
      category = json['service_categories']['name'] as String? ?? category;
    } else if (json['categoryName'] != null) {
      category = json['categoryName'] as String;
    } else if (json['category'] != null) {
      category = json['category'] as String;
    }

    List<String> stepsList = const [];
    if (json['steps'] != null && json['steps'] is List) {
      stepsList = (json['steps'] as List).map((e) => e.toString()).toList();
    }

    List<String> benefitsList = const [];
    if (json['benefits'] != null && json['benefits'] is List) {
      benefitsList = (json['benefits'] as List).map((e) => e.toString()).toList();
    }

    return SpaServiceModel(
      id: json['id']?.toString() ?? '',
      name: json['name'] as String? ?? json['title'] as String? ?? 'Dịch vụ Spa',
      categoryName: category,
      shortDescription: json['short_description'] as String? ?? json['description'] as String? ?? '',
      fullDescription: json['full_description'] as String? ?? json['description'] as String? ?? '',
      durationMinutes: (json['duration_minutes'] as num?)?.toInt() ?? 60,
      price: (json['price'] as num?)?.toDouble() ?? (json['priceRaw'] as num?)?.toDouble() ?? 450000.0,
      discountPrice: (json['discount_price'] as num?)?.toDouble(),
      imageUrl: json['image_url'] as String? ?? json['image'] as String? ?? 'assets/images/gioithieu_1.png',
      steps: stepsList,
      benefits: benefitsList,
      isFeatured: json['is_featured'] as bool? ?? false,
    );
  }
}

/// 6. Khóa đào tạo nghề MLD Academy (Mới)
class AcademyCourseModel {
  final String id;
  final String title;
  final String categoryName;
  final String instructorName;
  final String level;
  final int totalHours;
  final int totalSessions;
  final double tuitionFee;
  final double? discountFee;
  final String certificateTitle;
  final String imageUrl;
  final bool isHot;

  const AcademyCourseModel({
    required this.id,
    required this.title,
    required this.categoryName,
    required this.instructorName,
    this.level = 'Cơ bản',
    required this.totalHours,
    required this.totalSessions,
    required this.tuitionFee,
    this.discountFee,
    this.certificateTitle = 'Chứng chỉ MLD Academy',
    required this.imageUrl,
    this.isHot = false,
  });
}

/// 7. Giảng viên Đào tạo Academy (Mới)
class InstructorModel {
  final String id;
  final String name;
  final String title;
  final int experienceYears;
  final String avatarUrl;
  final String bio;
  final List<String> achievements;

  const InstructorModel({
    required this.id,
    required this.name,
    this.title = 'Giảng viên chuyên môn',
    required this.experienceYears,
    required this.avatarUrl,
    this.bio = '',
    this.achievements = const [],
  });
}

/// 8. Lọc tìm kiếm
class SearchFilterModel {
  final String? branchId;
  final String? categoryId;
  final String? priceRange;
  final String? sortBy;

  const SearchFilterModel({
    this.branchId,
    this.categoryId,
    this.priceRange,
    this.sortBy,
  });
}

// ==============================================================================
// TYPEDEFS TƯƠNG THÍCH MÃ NGUỒN CŨ
// ==============================================================================
typedef DoctorModel = TechnicianModel;
typedef ClinicModel = BranchModel;
