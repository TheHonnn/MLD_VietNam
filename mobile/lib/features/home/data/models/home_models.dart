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
