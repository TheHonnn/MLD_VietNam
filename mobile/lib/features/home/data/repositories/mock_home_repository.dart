import '../models/home_models.dart';

class MockHomeRepository {
  static List<BannerPromoModel> getPromotions() {
    return const [
      BannerPromoModel(
        id: 'promo-1',
        title: 'Ưu Đãi 30% Gói Dưỡng Sinh',
        subtitle: 'Trải nghiệm massage thư giãn & chăm sóc làn da chuyên sâu',
        tag: 'ĐỘC QUYỀN MLD',
        ctaText: 'Khám phá ngay',
        imageUrl: 'assets/images/banner_promo_1.png',
      ),
      BannerPromoModel(
        id: 'promo-2',
        title: 'Khóa Đào Tạo Kỹ Thuật Viên Spa',
        subtitle: 'Học viện MLD cấp giấy chứng nhận thực hành quốc tế',
        tag: 'TUYỂN SINH K26',
        ctaText: 'Đăng ký tư vấn',
        imageUrl: 'assets/images/banner_promo_2.png',
      ),
      BannerPromoModel(
        id: 'promo-3',
        title: 'Hydro-Care Thải Độc & Cấp Ẩm',
        subtitle: 'Liệu trình làm sạch sâu dịu nhẹ độc quyền tại MLD',
        tag: 'ƯU ĐÃI THÀNH VIÊN',
        ctaText: 'Xem chi tiết',
        imageUrl: 'assets/images/onboarding_hero.png',
      ),
    ];
  }

  static List<Map<String, dynamic>> getCategories() {
    return const [
      {
        'id': 'cat-1',
        'title': 'Massage Thư Giãn',
        'icon': 'spa_rounded',
        'badge': 'Hot',
      },
      {
        'id': 'cat-2',
        'title': 'Chăm Sóc Da',
        'icon': 'face_rounded',
        'badge': null,
      },
      {
        'id': 'cat-3',
        'title': 'Gội Đầu Dưỡng Sinh',
        'icon': 'shower_rounded',
        'badge': null,
      },
      {
        'id': 'cat-4',
        'title': 'Đào Tạo Spa',
        'icon': 'school_rounded',
        'badge': 'Mới',
      },
      {
        'id': 'cat-5',
        'title': 'Gói Liệu Trình',
        'icon': 'card_membership_rounded',
        'badge': null,
      },
      {
        'id': 'cat-6',
        'title': 'Tư Vấn Chăm Sóc',
        'icon': 'chat_bubble_outline_rounded',
        'badge': null,
      },
    ];
  }

  static List<TreatmentPackageModel> getFeaturedPackages() {
    return const [
      TreatmentPackageModel(
        id: 'pkg-1',
        title: 'Liệu Trình Massage Thư Giãn Toàn Thân',
        category: 'Massage & Dưỡng Sinh',
        price: 450000,
        originalPrice: 650000,
        duration: '60 phút',
        sessionsCount: 1,
        rating: 4.9,
        imageUrl: 'assets/images/gioithieu_1.png',
        badgeText: 'Bán chạy nhất',
      ),
      TreatmentPackageModel(
        id: 'pkg-2',
        title: 'Chăm Sóc Da Chuyên Sâu & Phục Hồi',
        category: 'Chăm Sóc Da',
        price: 700000,
        originalPrice: 900000,
        duration: '90 phút',
        sessionsCount: 1,
        rating: 4.95,
        imageUrl: 'assets/images/gioithieu_2.png',
        badgeText: 'Khuyên dùng',
      ),
      TreatmentPackageModel(
        id: 'pkg-3',
        title: 'Khóa Đào Tạo Kỹ Thuật Viên Spa Chuẩn Quốc Tế',
        category: 'Đào Tạo Nghề MLD',
        price: 8500000,
        originalPrice: 10000000,
        duration: '3 tháng',
        sessionsCount: 24,
        rating: 5.0,
        imageUrl: 'assets/images/banner_promo_2.png',
        badgeText: 'Cấp giấy chứng nhận',
      ),
    ];
  }

  static List<TechnicianModel> getTopTechnicians() {
    return const [
      TechnicianModel(
        id: '44444444-4444-4444-4444-444444444401',
        name: 'Trần Minh Phương',
        title: 'Kỹ Thuật Viên Massage',
        speciality: 'Massage Thư Giãn & Trị Liệu Vai Gáy',
        clinicName: 'Chi nhánh Quận 3',
        experienceYears: 6,
        rating: 4.95,
        reviewCount: 180,
        consultationFee: 450000,
        avatarUrl: 'assets/images/specialist_avatar_1.png',
        isAvailableToday: true,
        bio: 'Hơn 6 năm kinh nghiệm trị liệu dưỡng sinh bấm huyệt và massage thư giãn toàn thân.',
      ),
      TechnicianModel(
        id: '44444444-4444-4444-4444-444444444402',
        name: 'Nguyễn Thu Hà',
        title: 'Chuyên Viên Chăm Sóc Da',
        speciality: 'Chăm Sóc Da & Phục Hồi Cấp Ẩm',
        clinicName: 'Chi nhánh Quận 3',
        experienceYears: 5,
        rating: 4.88,
        reviewCount: 95,
        consultationFee: 650000,
        avatarUrl: 'assets/images/specialist_avatar_2.png',
        isAvailableToday: true,
        bio: 'Chuyên gia phục hồi da màng ẩm, kỹ thuật làm sạch sâu dịu nhẹ chuẩn MLD.',
      ),
      TechnicianModel(
        id: '44444444-4444-4444-4444-444444444403',
        name: 'Lê Hoài An',
        title: 'Chuyên Viên Chăm Sóc Cơ Thể',
        speciality: 'Chăm Sóc Cơ Thể & Thư Giãn',
        clinicName: 'Chi nhánh Cầu Giấy',
        experienceYears: 7,
        rating: 4.92,
        reviewCount: 140,
        consultationFee: 500000,
        avatarUrl: 'assets/images/specialist_avatar_3.png',
        isAvailableToday: true,
        bio: 'Kỹ thuật viên cao cấp giàu kinh nghiệm đào tạo và chăm sóc sức khỏe sắc đẹp.',
      ),
    ];
  }

  // Alias for backward compatibility
  static List<DoctorModel> getTopDoctors() => getTopTechnicians();

  static List<BranchModel> getNearbyBranches() {
    return const [
      BranchModel(
        id: 'aaaaaaaa-0001-0001-0001-000000000001',
        name: 'Trụ sở MLD Việt Nam (5 Master LV3)',
        code: 'MLD-HQ',
        phone: '096.7786.399',
        address: 'Số 260, Ngõ 271 Bùi Xương Trạch, Khương Đình, Hà Nội, Phường Khương Đình, Thành phố Hà Nội',
        district: 'Khương Đình',
        city: 'Hà Nội',
        distanceKm: 0.0,
        openingHours: '08:30 - 20:30 (Cả tuần)',
        rating: 4.9,
        imageUrl: 'assets/images/chinhanh.webp',
        galleryUrls: [
          'https://images.unsplash.com/photo-1540555700478-4be289fbecef',
          'https://images.unsplash.com/photo-1560750588-73207b1ef5b8',
        ],
        services: ['Dẫn lưu bạch huyết MLD', 'Điều trị phù bạch huyết', 'Đào tạo Master Vodder'],
        amenities: ['Phòng VIP riêng tư', 'Phòng khám chuyên khoa', 'Bãi đỗ ô tô miễn phí', 'Trà thảo mộc dưỡng nhan'],
        latitude: 20.9856,
        longitude: 105.8172,
      ),
    ];
  }

  // Alias for backward compatibility
  static List<ClinicModel> getNearbyClinics() => getNearbyBranches();
  static List<BranchModel> getBranches() => getNearbyBranches();
  static List<ClinicModel> getClinics() => getNearbyBranches();
  static List<TechnicianModel> getFeaturedDoctors() => getTopTechnicians();

  static List<SpaServiceModel> getFeaturedServices() {
    return const [
      // Dịch vụ gốc duy nhất trên CSDL Supabase
      SpaServiceModel(
        id: '235166f2-66c9-4231-bbe1-af91b48fc67c',
        name: 'Điều trị dẫn lưu phù bạch huyết chuyên sâu (Vodder MLD)',
        categoryName: 'Dẫn lưu bạch huyết MLD',
        shortDescription: 'Phương pháp chuẩn Y khoa Quốc tế kích hoạt hệ tuần hoàn bạch huyết, tiêu phù nề sau phẫu thuật và giảm đau nhức.',
        fullDescription: 'Ứng dụng kỹ thuật Vodder MLD nhẹ nhàng kích hoạt hệ mao mạch bạch huyết dưới bề mặt da, hỗ trợ giải phóng dịch ứ đọng, tăng cường miễn dịch và thải độc tế bào.',
        durationMinutes: 60,
        price: 700000,
        vatRate: 0.0,
        imageUrl: 'assets/images/logo.webp',
        isFeatured: true,
      ),
    ];
  }
}
