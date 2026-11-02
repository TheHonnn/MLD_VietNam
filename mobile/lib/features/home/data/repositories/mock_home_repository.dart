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
        id: '22222222-0002-0001-0001-000000000001',
        title: 'Gói Chăm Sóc Mở Rộng (10 buổi)',
        category: '3 Chương Trình Chăm Sóc Hệ Bạch Huyết',
        price: 8600000,
        originalPrice: 9000000,
        duration: '60 phút/buổi',
        sessionsCount: 10,
        rating: 4.98,
        imageUrl: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=80',
        badgeText: 'Khuyên dùng',
        description: 'Liệu trình 10 buổi Chăm sóc mở rộng (60\'/buổi). Đã bao gồm VAT 8%. Tiết kiệm 400.000đ.',
        validityMonths: 3,
      ),
      TreatmentPackageModel(
        id: '22222222-0003-0001-0001-000000000001',
        title: 'Gói Chăm Sóc Toàn Diện (10 buổi)',
        category: '3 Chương Trình Chăm Sóc Hệ Bạch Huyết',
        price: 16200000,
        originalPrice: 17000000,
        duration: '90 phút/buổi',
        sessionsCount: 10,
        rating: 5.0,
        imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80',
        badgeText: 'Toàn diện cao cấp',
        description: 'Liệu trình 10 buổi Chăm sóc toàn diện (90\'/buổi). Đã bao gồm VAT 8%. Tiết kiệm 800.000đ.',
        validityMonths: 3,
      ),
      TreatmentPackageModel(
        id: '22222222-0001-0001-0001-000000000001',
        title: 'Gói Chăm Sóc Khu Trú (10 buổi)',
        category: '3 Chương Trình Chăm Sóc Hệ Bạch Huyết',
        price: 4800000,
        originalPrice: 5000000,
        duration: '45 phút/buổi',
        sessionsCount: 10,
        rating: 4.92,
        imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80',
        badgeText: 'Phổ biến nhất',
        description: 'Liệu trình 10 buổi Chăm sóc khu trú (45\'/buổi). Đã bao gồm VAT 8%. Tiết kiệm 200.000đ.',
        validityMonths: 3,
      ),
      TreatmentPackageModel(
        id: '22222222-0003-0001-0001-000000000002',
        title: 'Gói Chăm Sóc Toàn Diện (20 buổi)',
        category: '3 Chương Trình Chăm Sóc Hệ Bạch Huyết',
        price: 30800000,
        originalPrice: 34000000,
        duration: '90 phút/buổi',
        sessionsCount: 20,
        rating: 5.0,
        imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80',
        badgeText: 'Tiết kiệm 3.2M',
        description: 'Liệu trình 20 buổi Chăm sóc toàn diện (90\'/buổi). Đã bao gồm VAT 8%. Tiết kiệm 3.200.000đ.',
        validityMonths: 6,
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
        name: 'Lưu phù bạch huyết',
        categoryName: 'Dẫn lưu bạch huyết MLD',
        shortDescription: 'Phương pháp chuẩn Y khoa Quốc tế kích hoạt hệ tuần hoàn bạch huyết, tiêu phù nề sau phẫu thuật và giảm đau nhức.',
        fullDescription: 'Ứng dụng kỹ thuật Vodder MLD nhẹ nhàng kích hoạt hệ mao mạch bạch huyết dưới bề mặt da, hỗ trợ giải phóng dịch ứ đọng, tăng cường miễn dịch và thải độc tế bào.',
        durationMinutes: 60,
        price: 700000,
        vatRate: 0.0,
        imageUrl: 'assets/images/service_luu_phu_bach_huyet.png',
        isFeatured: true,
      ),
    ];
  }
}
