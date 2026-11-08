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
        subtitle: 'Học viện MLD cấp giấy chứng nhận thực hành chuyên nghiệp',
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
        title: 'Khóa Đào Tạo Kỹ Thuật Viên Spa Chuyên Nghiệp',
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
      SpaServiceModel(
        id: '11111111-2222-3333-4444-000000000001',
        name: "Chăm sóc khu trú (45')",
        categoryName: '3 Chương Trình Chăm Sóc Hệ Bạch Huyết',
        shortDescription: 'Chăm sóc khu trú 45 phút tập trung vào vùng chỉ định, giải tỏa ứ trệ và kích hoạt hệ bạch huyết nông & sâu.',
        fullDescription: 'Chương trình chăm sóc khu trú 45 phút áp dụng kỹ thuật dẫn lưu bạch huyết Vodder...',
        durationMinutes: 45,
        price: 500000,
        vatRate: 0.08,
        imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80',
        isFeatured: true,
      ),
      SpaServiceModel(
        id: '235166f2-66c9-4231-bbe1-af91b48fc67c',
        name: "Chăm sóc mở rộng (60')",
        categoryName: '3 Chương Trình Chăm Sóc Hệ Bạch Huyết',
        shortDescription: 'Chăm sóc mở rộng 60 phút tăng cường phạm vi dẫn lưu nhiều vùng liên kết, tối ưu hóa hệ miễn dịch và tiêu sưng.',
        fullDescription: 'Chương trình chăm sóc mở rộng 60 phút bao quát phạm vi liên kết rộng hơn trên cơ thể...',
        durationMinutes: 60,
        price: 900000,
        vatRate: 0.08,
        imageUrl: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=80',
        isFeatured: true,
      ),
      SpaServiceModel(
        id: '11111111-2222-3333-4444-000000000003',
        name: "Chăm sóc toàn diện (90')",
        categoryName: '3 Chương Trình Chăm Sóc Hệ Bạch Huyết',
        shortDescription: 'Chăm sóc toàn diện 90 phút toàn thân cao cấp, dẫn lưu triệt để toàn bộ hệ bạch huyết sâu và nông từ gốc đến ngọn.',
        fullDescription: 'Chương trình chăm sóc toàn diện 90 phút là phác đồ đỉnh cao của MLD Vietnam...',
        durationMinutes: 90,
        price: 1700000,
        vatRate: 0.08,
        imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80',
        isFeatured: true,
      ),
    ];
  }
}
