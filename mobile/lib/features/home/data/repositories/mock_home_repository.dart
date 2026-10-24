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
        subtitle: 'Học viện MLD Academy cấp giấy chứng nhận thực hành quốc tế',
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
        price: 650000,
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
        name: 'MLD Beauty & Spa — Cơ sở Nam Kỳ Khởi Nghĩa',
        code: 'MLD-Q3',
        phone: '02839301234',
        address: 'Số 186 Nam Kỳ Khởi Nghĩa, Phường Võ Thị Sáu, Quận 3',
        district: 'Quận 3',
        city: 'TP. Hồ Chí Minh',
        distanceKm: 1.2,
        openingHours: '08:30 - 20:30 (Cả tuần)',
        rating: 4.9,
        imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef',
        galleryUrls: [
          'https://images.unsplash.com/photo-1540555700478-4be289fbecef',
          'https://images.unsplash.com/photo-1560750588-73207b1ef5b8',
        ],
        services: ['Massage Thư Giãn', 'Chăm Sóc Da', 'Gội Đầu Dưỡng Sinh', 'Đào Tạo'],
        amenities: ['Phòng VIP riêng tư', 'Máy soi da đa tầng 3D', 'Bãi đỗ ô tô miễn phí', 'Trà thảo mộc dưỡng nhan'],
        latitude: 10.7845,
        longitude: 106.6912,
      ),
      BranchModel(
        id: 'aaaaaaaa-0001-0001-0001-000000000002',
        name: 'MLD Beauty & Spa — Cơ sở Nguyễn Thị Minh Khai',
        code: 'MLD-Q1',
        phone: '02838295678',
        address: 'Số 45 Nguyễn Thị Minh Khai, Phường Bến Nghé, Quận 1',
        district: 'Quận 1',
        city: 'TP. Hồ Chí Minh',
        distanceKm: 2.5,
        openingHours: '08:30 - 21:00 (Cả tuần)',
        rating: 4.95,
        imageUrl: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8',
        galleryUrls: [
          'https://images.unsplash.com/photo-1560750588-73207b1ef5b8',
        ],
        services: ['Đào Tạo Spa', 'Chăm Sóc Da', 'Massage Trị Liệu', 'Dưỡng Sinh'],
        amenities: ['Phòng Đào tạo thực hành Academy', 'Không gian thiền dưỡng sinh', 'Trang thiết bị chuẩn y khoa', 'Khu tiếp đón cao cấp'],
        latitude: 10.7812,
        longitude: 106.7001,
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
      // 1. Massage thư giãn
      SpaServiceModel(
        id: 'srv-001',
        name: 'Massage thư giãn toàn thân',
        categoryName: 'Massage thư giãn',
        shortDescription: 'Thả lỏng cơ thể trong không gian yên tĩnh.',
        fullDescription: 'Dịch vụ massage thư giãn toàn thân sử dụng tinh dầu tự nhiên kết hợp các kỹ thuật ấn huyệt nhẹ nhàng, giúp xua tan mệt mỏi và phục hồi năng lượng.',
        durationMinutes: 60,
        price: 450000,
        discountPrice: 350000,
        imageUrl: 'assets/images/specialist_hero_1.png',
        isFeatured: true,
      ),
      SpaServiceModel(
        id: 'srv-005',
        name: 'Massage đá nóng Himalaya',
        categoryName: 'Massage thư giãn',
        shortDescription: 'Năng lượng nhiệt đá muối đào thải hàn khí cơ thể.',
        fullDescription: 'Liệu pháp sử dụng đá muối khoáng tự nhiên từ dãy Himalaya giữ nhiệt lâu, tác động sâu vào các tầng cơ giúp lưu thông khí huyết và ngủ ngon.',
        durationMinutes: 75,
        price: 550000,
        discountPrice: 440000,
        imageUrl: 'assets/images/gioithieu_1.png',
        isFeatured: true,
      ),
      SpaServiceModel(
        id: 'srv-006',
        name: 'Massage tinh dầu thảo mộc dưỡng sinh',
        categoryName: 'Massage thư giãn',
        shortDescription: 'Hương thơm tự nhiên thư giãn tinh thần sâu.',
        fullDescription: 'Kết hợp các loại tinh dầu thảo mộc quý độc quyền MLD như tràm gió, gừng già và oải hương giúp làm dịu hệ thần kinh căng thẳng.',
        durationMinutes: 60,
        price: 480000,
        imageUrl: 'assets/images/branch_hero_1.png',
        isFeatured: false,
      ),

      // 2. Chăm sóc da
      SpaServiceModel(
        id: 'srv-002',
        name: 'Chăm sóc da chuyên sâu',
        categoryName: 'Chăm sóc da',
        shortDescription: 'Làm sạch và nuôi dưỡng làn da nhẹ nhàng.',
        fullDescription: 'Quy trình chăm sóc da chuẩn y khoa giúp làm sạch sâu, cân bằng độ ẩm và nuôi dưỡng làn da khỏe mạnh từ sâu bên trong.',
        durationMinutes: 90,
        price: 650000,
        discountPrice: 520000,
        imageUrl: 'assets/images/gioithieu_2.png',
        isFeatured: true,
      ),
      SpaServiceModel(
        id: 'srv-007',
        name: 'Cấp ẩm phục hồi Hydro-Care',
        categoryName: 'Chăm sóc da',
        shortDescription: 'Phục hồi màng ẩm sinh học dịu nhẹ cho da nhạy cảm.',
        fullDescription: 'Quy trình điện di dưỡng chất cấp ẩm tầng sâu kết hợp mặt nạ tế bào gốc thảo dược giúp làm dịu da khô ráp, phục hồi tức thì.',
        durationMinutes: 60,
        price: 520000,
        imageUrl: 'assets/images/gioithieu_2.png',
        isFeatured: false,
      ),

      // 3. Chăm sóc cơ thể
      SpaServiceModel(
        id: 'srv-003',
        name: 'Chăm sóc cổ vai gáy',
        categoryName: 'Chăm sóc cơ thể',
        shortDescription: 'Thư giãn vùng cổ, vai và gáy với lực phù hợp.',
        fullDescription: 'Tập trung giải tỏa căng thẳng cho vùng cơ cổ, vai gáy do ngồi làm việc nhiều, cải thiện tuần hoàn máu.',
        durationMinutes: 45,
        price: 350000,
        imageUrl: 'assets/images/branch_hero_1.png',
        isFeatured: false,
      ),
      SpaServiceModel(
        id: 'srv-009',
        name: 'Trị liệu thắt lưng & cột sống',
        categoryName: 'Chăm sóc cơ thể',
        shortDescription: 'Giải phóng chèn ép cơ thang và đĩa đệm lưng dưới.',
        fullDescription: 'Bài trị liệu chuyên sâu tác động nhóm cơ lưng, giải tỏa các cơn nhức mỏi do ngồi sai tư thế lâu ngày.',
        durationMinutes: 60,
        price: 480000,
        imageUrl: 'assets/images/specialist_hero_1.png',
        isFeatured: false,
      ),
      SpaServiceModel(
        id: 'srv-010',
        name: 'Ngâm chân thảo dược & bấm huyệt',
        categoryName: 'Chăm sóc cơ thể',
        shortDescription: 'Khai mở 60 huyệt vị bàn chân, ấm tạng phủ.',
        fullDescription: 'Nước ngâm chân từ gừng ta, muối hồng và thảo dược dưỡng sinh MLD kết hợp bài ấn huyệt lòng bàn chân chuyên sâu.',
        durationMinutes: 45,
        price: 290000,
        imageUrl: 'assets/images/gioithieu_3.png',
        isFeatured: false,
      ),

      // 4. Chăm sóc sức khỏe
      SpaServiceModel(
        id: 'srv-011',
        name: 'Đả thông kinh lạc toàn thân',
        categoryName: 'Chăm sóc sức khỏe',
        shortDescription: 'Khai thông 12 đường kinh chính, khí huyết lưu thông.',
        fullDescription: 'Liệu trình dưỡng sinh kinh lạc chuyên biệt giúp giải tỏa ứ trệ, tăng cường chuyển hóa trao đổi chất và phục hồi năng lượng sống.',
        durationMinutes: 90,
        price: 750000,
        discountPrice: 590000,
        imageUrl: 'assets/images/branch_hero_2.png',
        isFeatured: true,
      ),
      SpaServiceModel(
        id: 'srv-012',
        name: 'Liệu pháp ngải cứu ôn ấm trục hàn',
        categoryName: 'Chăm sóc sức khỏe',
        shortDescription: 'Xua tan hàn khí, ấm kinh lạc và nâng cao thể trạng.',
        fullDescription: 'Sử dụng ngải nhung thuần khiết kết hợp nhiệt liệu dưỡng sinh tác động vào các huyệt vị quan trọng trên đốc mạch và bàng quang kinh.',
        durationMinutes: 60,
        price: 520000,
        imageUrl: 'assets/images/specialist_hero_1.png',
        isFeatured: false,
      ),

      // 5. Gói liệu trình
      SpaServiceModel(
        id: 'srv-004',
        name: 'Gói massage trị liệu toàn thân 5 buổi',
        categoryName: 'Gói liệu trình',
        shortDescription: 'Tiết kiệm chi phí với liệu trình chăm sóc định kỳ.',
        fullDescription: 'Gói chăm sóc định kỳ giúp duy trì trạng thái cơ thể khỏe khoắn, dẻo dai và tràn đầy sinh lực.',
        durationMinutes: 60,
        price: 2100000,
        imageUrl: 'assets/images/gioithieu_1.png',
        isFeatured: false,
      ),
      SpaServiceModel(
        id: 'srv-013',
        name: 'Gói Trị liệu Cổ Vai Gáy 10 buổi',
        categoryName: 'Gói liệu trình',
        shortDescription: 'Phác đồ 10 buổi chuyên sâu dứt điểm đau mỏi gáy.',
        fullDescription: 'Liệu trình 10 buổi điều chỉnh và giải phóng điểm co thắt cơ sâu, cải thiện biên độ xoay cổ và chống tái phát.',
        durationMinutes: 60,
        price: 3500000,
        imageUrl: 'assets/images/specialist_hero_1.png',
        isFeatured: true,
      ),
    ];
  }
}
