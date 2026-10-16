import 'dart:async';
import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/widgets/profile_image_picker.dart';
import '../../../booking/data/models/booking_models.dart';
import '../../../booking/presentation/screens/c01_service_selection_screen.dart';
import '../../../membership/data/repositories/mock_membership_repository.dart';
import '../../data/models/home_models.dart';
import '../../data/repositories/mock_home_repository.dart';
import 'b04_search_screen.dart';
import '../../../services/presentation/screens/b03_service_detail_screen.dart';
import '../../../directory/presentation/screens/b05_branch_listing_screen.dart';
import '../../../directory/presentation/screens/b07_specialist_listing_screen.dart';
import '../../../treatment/presentation/screens/d01_my_packages_screen.dart';
import '../../../treatment/presentation/screens/d08_notifications_screen.dart';

class B01HomeScreen extends StatefulWidget {
  final VoidCallback? onNavigateToServices;
  final VoidCallback? onNavigateToBooking;
  final VoidCallback? onNavigateToAcademy;
  final VoidCallback? onNavigateToProfile;

  const B01HomeScreen({
    super.key,
    this.onNavigateToServices,
    this.onNavigateToBooking,
    this.onNavigateToAcademy,
    this.onNavigateToProfile,
  });

  @override
  State<B01HomeScreen> createState() => _B01HomeScreenState();
}

class _B01HomeScreenState extends State<B01HomeScreen> {
  final PageController _heroBannerController = PageController();
  int _heroBannerIndex = 0;
  Timer? _heroTimer;
  String _selectedBranch = 'Chi nhánh Quận 3';

  final List<Map<String, String>> _heroBanners = [
    {
      'image': 'assets/images/gioithieu_1.png',
      'title': 'Chăm sóc sức khỏe – Nâng tầm chất lượng sống',
      'description': 'Đặt lịch dễ dàng, tận hưởng dịch vụ chuyên nghiệp.',
      'btnText': 'Đặt lịch ngay',
    },
    {
      'image': 'assets/images/gioithieu_2.png',
      'title': 'Chăm sóc da & Trị liệu chuyên sâu',
      'description': 'Quy trình phục hồi làn da dịu nhẹ, chu đáo cùng chuyên viên.',
      'btnText': 'Đặt lịch chăm sóc da',
    },
    {
      'image': 'assets/images/gioithieu_3.png',
      'title': 'Học nghề Spa & Đào tạo chuyên môn chuyên nghiệp',
      'description': 'Khởi đầu sự nghiệp với các khóa đào tạo thực hành bài bản.',
      'btnText': 'Khám phá khóa học',
    },
  ];

  final List<Map<String, dynamic>> _shortcuts = [
    {
      'title': 'Đặt lịch',
      'icon': Icons.calendar_month_outlined,
    },
    {
      'title': 'Liệu trình',
      'icon': Icons.spa_outlined,
    },
    {
      'title': 'Khóa học',
      'icon': Icons.school_outlined,
    },
    {
      'title': 'Ưu đãi',
      'icon': Icons.local_offer_outlined,
    },
  ];

  final List<Map<String, dynamic>> _categories = [
    {
      'title': 'Massage thư giãn',
      'icon': Icons.spa_outlined,
    },
    {
      'title': 'Chăm sóc da',
      'icon': Icons.auto_awesome_outlined,
    },
    {
      'title': 'Chăm sóc cơ thể',
      'icon': Icons.self_improvement_rounded,
    },
    {
      'title': 'Chăm sóc sức khỏe',
      'icon': Icons.favorite_border_rounded,
    },
    {
      'title': 'Gói liệu trình',
      'icon': Icons.layers_outlined,
    },
    {
      'title': 'Xem tất cả',
      'icon': Icons.grid_view_rounded,
    },
  ];

  final List<Map<String, dynamic>> _suggestedServices = [
    {
      'id': 'srv_1',
      'title': 'Massage thư giãn toàn thân',
      'duration': '60 phút',
      'price': '450.000đ',
      'description': 'Thả lỏng cơ thể trong không gian yên tĩnh.',
      'image': 'assets/images/gioithieu_1.png',
      'isFavorite': true,
    },
    {
      'id': 'srv_2',
      'title': 'Chăm sóc da chuyên sâu',
      'duration': '90 phút',
      'price': '650.000đ',
      'description': 'Chăm sóc làn da với quy trình nhẹ nhàng, chu đáo.',
      'image': 'assets/images/gioithieu_2.png',
      'isFavorite': false,
    },
  ];

  @override
  void initState() {
    super.initState();
    _startHeroTimer();
  }

  @override
  void deactivate() {
    _heroTimer?.cancel();
    super.deactivate();
  }

  @override
  void dispose() {
    _heroTimer?.cancel();
    _heroBannerController.dispose();
    super.dispose();
  }

  void _startHeroTimer() {
    _heroTimer?.cancel();
    _heroTimer = Timer.periodic(const Duration(seconds: 4), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      try {
        if (_heroBannerController.hasClients) {
          final nextIndex = (_heroBannerIndex + 1) % _heroBanners.length;
          _heroBannerController.animateToPage(
            nextIndex,
            duration: const Duration(milliseconds: 400),
            curve: Curves.easeInOut,
          );
        }
      } catch (_) {}
    });
  }

  void _handleBooking([String? serviceTitle]) {
    SpaServiceModel? preselectedService;
    if (serviceTitle != null && serviceTitle.isNotEmpty) {
      final allServices = MockHomeRepository.getFeaturedServices();
      try {
        preselectedService = allServices.firstWhere(
          (s) => s.name.toLowerCase().contains(serviceTitle.toLowerCase()) ||
                 serviceTitle.toLowerCase().contains(s.name.toLowerCase()),
        );
      } catch (_) {}
    }

    final flow = BookingFlowState(
      selectedService: preselectedService,
    );

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => C01ServiceSelectionScreen(flowState: flow),
      ),
    );
  }

  void _showBranchPicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Chọn chi nhánh',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textHeading,
                ),
              ),
              const SizedBox(height: 16),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Chi nhánh Quận 3'),
                subtitle: const Text('123 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh'),
                trailing: _selectedBranch == 'Chi nhánh Quận 3'
                    ? const Icon(Icons.check_circle, color: AppColors.primary)
                    : null,
                onTap: () {
                  setState(() {
                    _selectedBranch = 'Chi nhánh Quận 3';
                  });
                  Navigator.pop(context);
                },
              ),
              const Divider(),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Chi nhánh Cầu Giấy'),
                subtitle: const Text('45 Cầu Giấy, Quan Hoa, Cầu Giấy, Hà Nội'),
                trailing: _selectedBranch == 'Chi nhánh Cầu Giấy'
                    ? const Icon(Icons.check_circle, color: AppColors.primary)
                    : null,
                onTap: () {
                  setState(() {
                    _selectedBranch = 'Chi nhánh Cầu Giấy';
                  });
                  Navigator.pop(context);
                },
              ),
              const Divider(),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: TextButton.icon(
                  icon: const Icon(Icons.store_mall_directory_outlined, color: AppColors.primary),
                  label: const Text(
                    'Xem toàn bộ hệ thống chi nhánh',
                    style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600),
                  ),
                  onPressed: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const B05BranchListingScreen()),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showNotificationSheet() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const D08NotificationsScreen()),
    );
  }

  void _showAppointmentDetailSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Chi tiết lịch hẹn',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textHeading,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceSecondary,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Mã lịch hẹn: MLD-20261012-8821',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFF236B42).withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              'Đã xác nhận',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF236B42),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'Massage thư giãn toàn thân',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textHeading,
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Thời gian: 10:00 – 11:00, Thứ Hai 12/10/2026 (60 phút)',
                        style: TextStyle(fontSize: 13, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Kỹ thuật viên: Trần Minh Phương',
                        style: TextStyle(fontSize: 13, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Địa điểm: Chi nhánh Quận 3\n123 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh',
                        style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                Center(
                  child: Column(
                    children: [
                      Container(
                        width: 140,
                        height: 140,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: const Icon(
                          Icons.qr_code_2_rounded,
                          size: 110,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Xuất trình mã này tại quầy lễ tân để check-in nhanh',
                        style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () => Navigator.pop(context),
                    child: const Text(
                      'Đóng',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background, // #F8F1E8
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.only(
            left: 20.0,
            right: 20.0,
            top: 8.0,
            bottom: 32.0,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ==========================================
              // 1. ACCUEIL PERSONNALISÉ (Lời chào + Avatar + Thông báo)
              // ==========================================
              SizedBox(
                height: 64,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Avatar (44x44, circle)
                    InkWell(
                      onTap: widget.onNavigateToProfile,
                      borderRadius: BorderRadius.circular(22),
                      child: AppProfileAvatar(
                        avatarUrl: MockMembershipRepository().profile.avatarUrl,
                        size: 44,
                        borderWidth: 1.5,
                        borderColor: AppColors.secondary,
                        showShadow: false,
                      ),
                    ),
                    const SizedBox(width: 12),

                    // Salutation texts (gap 4)
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Xin chào, ${MockMembershipRepository().profile.fullName.split(' ').last}!',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary, // #40352F
                            ),
                          ),
                          const SizedBox(height: 2),
                          const Text(
                            'Hôm nay bạn muốn chăm sóc bản thân như thế nào?',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w400,
                              color: AppColors.textSecondary, // #6B6158
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),

                    // Chuông thông báo (44x44 kèm chấm đỏ chưa đọc 7x7)
                    InkWell(
                      onTap: _showNotificationSheet,
                      borderRadius: BorderRadius.circular(12),
                      child: SizedBox(
                        width: 44,
                        height: 44,
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            const Icon(
                              Icons.notifications_none_rounded,
                              size: 26,
                              color: AppColors.primary, // #985018
                            ),
                            Positioned(
                              top: 8,
                              right: 8,
                              child: Container(
                                width: 7,
                                height: 7,
                                decoration: const BoxDecoration(
                                  color: Color(0xFFD64545), // #D64545 đỏ
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // ==========================================
              // 2. LỰA CHỌN CHI NHÁNH (Lựa chọn)
              // ==========================================
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Chi nhánh đang chọn',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textPrimary, // #40352F
                    ),
                  ),
                  const SizedBox(height: 8),
                  InkWell(
                    onTap: _showBranchPicker,
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      height: 52,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        color: AppColors.surface, // white
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: AppColors.border, // #E3D1BF
                          width: 1.0,
                        ),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              _selectedBranch,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w400,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ),
                          const Icon(
                            Icons.keyboard_arrow_down_rounded,
                            size: 20,
                            color: Color(0xFF80766E),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // ==========================================
              // 3. SEARCH BAR (Tìm kiếm: 350x52, r=12)
              // ==========================================
              InkWell(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const B04SearchScreen()),
                  );
                },
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  height: 52,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: AppColors.surface, // white
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppColors.border, // #E3D1BF
                      width: 1.0,
                    ),
                  ),
                  child: const Row(
                    children: [
                      Icon(
                        Icons.search_rounded,
                        size: 22,
                        color: AppColors.textSecondary,
                      ),
                      SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Tìm dịch vụ, khóa học, chuyên viên...',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w400,
                            color: AppColors.textSecondary, // #6B6158
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // ==========================================
              // 4. HOME HERO BANNER CAROUSEL (350x446, r=20, #F3E2CE)
              // ==========================================
              Container(
                decoration: BoxDecoration(
                  color: AppColors.surfaceSecondary, // #F3E2CE
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Ảnh trượt Hero (Chiều cao 176, r=16)
                    SizedBox(
                      height: 176,
                      child: ClipRRect(
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                        child: PageView.builder(
                          controller: _heroBannerController,
                          itemCount: _heroBanners.length,
                          onPageChanged: (index) {
                            setState(() {
                              _heroBannerIndex = index;
                            });
                          },
                          itemBuilder: (context, index) {
                            final banner = _heroBanners[index];
                            return Image.asset(
                              banner['image']!,
                              fit: BoxFit.cover,
                              width: double.infinity,
                              errorBuilder: (_, __, ___) => Container(
                                color: AppColors.surfaceDisabled,
                                child: const Center(
                                  child: Icon(Icons.spa_rounded, size: 48, color: AppColors.primary),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ),

                    // Lời mời chăm sóc (Padding 20, gap 12)
                    Padding(
                      padding: const EdgeInsets.all(20.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Accent bar (40x2, color #C58D59)
                          Container(
                            width: 40,
                            height: 2,
                            decoration: BoxDecoration(
                              color: AppColors.secondary, // #C58D59
                              borderRadius: BorderRadius.circular(1),
                            ),
                          ),
                          const SizedBox(height: 12),

                          // Tiêu đề banner (20px, w600, #693B20)
                          Text(
                            _heroBanners[_heroBannerIndex]['title']!,
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w600,
                              height: 1.3,
                              color: AppColors.textHeading, // #693B20
                            ),
                          ),
                          const SizedBox(height: 8),

                          // Mô tả banner (14px, w400, #40352F)
                          Text(
                            _heroBanners[_heroBannerIndex]['description']!,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w400,
                              height: 1.4,
                              color: AppColors.textPrimary, // #40352F
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Nút hành động chính (height 56, r=14, #985018)
                          SizedBox(
                            width: double.infinity,
                            height: 56,
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primary, // #985018
                                foregroundColor: AppColors.textInverse, // white
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                elevation: 0,
                              ),
                              onPressed: () {
                                if (_heroBannerIndex == 2) {
                                  widget.onNavigateToAcademy?.call();
                                } else {
                                  _handleBooking(_heroBanners[_heroBannerIndex]['title']);
                                }
                              },
                              child: Text(
                                _heroBanners[_heroBannerIndex]['btnText']!,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 14),

                          // Chỉ báo ảnh Carousel (24x8 and 8x8, gap 8)
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: List.generate(_heroBanners.length, (dotIndex) {
                              final bool isActive = _heroBannerIndex == dotIndex;
                              return Container(
                                margin: const EdgeInsets.symmetric(horizontal: 4),
                                width: isActive ? 24 : 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: isActive ? AppColors.primary : AppColors.border,
                                  borderRadius: BorderRadius.circular(100),
                                ),
                              );
                            }),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // ==========================================
              // 5. LỐI TẮT (4 Icons vuông 56x56, r=16, #F3E2CE)
              // ==========================================
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: _shortcuts.map((item) {
                  return InkWell(
                    onTap: () {
                      if (item['title'] == 'Đặt lịch') {
                        _handleBooking();
                      } else if (item['title'] == 'Liệu trình') {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const D01MyPackagesScreen()),
                        );
                      } else if (item['title'] == 'Khóa học') {
                        widget.onNavigateToAcademy?.call();
                      } else {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const B07SpecialistListingScreen()),
                        );
                      }
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: SizedBox(
                      width: 78,
                      child: Column(
                        children: [
                          Container(
                            width: 56,
                            height: 56,
                            decoration: BoxDecoration(
                              color: AppColors.surfaceSecondary, // #F3E2CE
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Icon(
                              item['icon'] as IconData,
                              size: 24,
                              color: AppColors.primary, // #985018
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            item['title'] as String,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w400,
                              color: AppColors.textPrimary, // #40352F
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),

              const SizedBox(height: 28),

              // ==========================================
              // 6. BẠN MUỐN TRẢI NGHIỆM GÌ? (Danh mục ngang 144x112, r=16)
              // ==========================================
              const Text(
                'Bạn muốn trải nghiệm gì?',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textHeading, // #693B20
                ),
              ),
              const SizedBox(height: 14),

              SizedBox(
                height: 112,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  itemCount: _categories.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 12),
                  itemBuilder: (context, index) {
                    final cat = _categories[index];
                    return InkWell(
                      onTap: () {
                        if (cat['title'] == 'Gói liệu trình') {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const D01MyPackagesScreen()),
                          );
                        } else {
                          widget.onNavigateToServices?.call();
                        }
                      },
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        width: 144,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.surface, // white
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.border.withValues(alpha: 0.6)),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.03),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Icon(
                              cat['icon'] as IconData,
                              size: 26,
                              color: AppColors.primary, // #985018
                            ),
                            Text(
                              cat['title'] as String,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                                color: AppColors.textPrimary, // #40352F
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),

              const SizedBox(height: 28),

              // ==========================================
              // 7. GỢI Ý DÀNH CHO BẠN (Service Cards 350px, r=20)
              // ==========================================
              const Text(
                'Gợi ý dành cho bạn',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textHeading, // #693B20
                ),
              ),
              const SizedBox(height: 14),

              Column(
                children: _suggestedServices.map((service) {
                  return InkWell(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => B03ServiceDetailScreen(
                            title: service['title'] as String,
                            duration: service['duration'] as String,
                            price: service['price'] as String,
                            image: service['image'] as String,
                            description: service['description'] as String,
                          ),
                        ),
                      );
                    },
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 20.0),
                      decoration: BoxDecoration(
                        color: AppColors.surface, // white
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.border.withValues(alpha: 0.6)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Ảnh dịch vụ (Chiều cao 172, r=20 top)
                        Stack(
                          children: [
                            ClipRRect(
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                              child: SizedBox(
                                height: 172,
                                width: double.infinity,
                                child: Image.asset(
                                  service['image'] as String,
                                  fit: BoxFit.cover,
                                ),
                              ),
                            ),
                            // Nút yêu thích FavoriteButton (44x44, r=12, white)
                            Positioned(
                              top: 12,
                              right: 12,
                              child: InkWell(
                                onTap: () {
                                  setState(() {
                                    service['isFavorite'] = !(service['isFavorite'] as bool);
                                  });
                                },
                                borderRadius: BorderRadius.circular(12),
                                child: Container(
                                  width: 44,
                                  height: 44,
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.1),
                                        blurRadius: 6,
                                      ),
                                    ],
                                  ),
                                  child: Icon(
                                    (service['isFavorite'] as bool)
                                        ? Icons.favorite_rounded
                                        : Icons.favorite_border_rounded,
                                    color: (service['isFavorite'] as bool)
                                        ? const Color(0xFFD64545)
                                        : AppColors.primary,
                                    size: 22,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),

                        // Thông tin dịch vụ (Padding 16, gap 8)
                        Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                service['title'] as String,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textPrimary, // #40352F
                                ),
                              ),
                              const SizedBox(height: 6),

                              // Thông số thời lượng & Giá
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    service['duration'] as String,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w400,
                                      color: AppColors.textSecondary, // #6B6158
                                    ),
                                  ),
                                  Text(
                                    service['price'] as String,
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.primary, // #985018
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),

                              // Mô tả
                              Text(
                                service['description'] as String,
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w400,
                                  color: AppColors.textPrimary, // #40352F
                                ),
                              ),
                              const SizedBox(height: 16),

                              // Nút Đặt lịch (height 56, r=14, #985018)
                              SizedBox(
                                width: double.infinity,
                                height: 56,
                                child: ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primary, // #985018
                                    foregroundColor: AppColors.textInverse,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                    elevation: 0,
                                  ),
                                  onPressed: () => _handleBooking(service['title'] as String),
                                  child: const Text(
                                    'Đặt lịch',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
              ),

              // ==========================================
              // 8. LỊCH HẸN SẮP TỚI (350x248, r=16, #F3E2CE)
              // ==========================================
              Container(
                padding: const EdgeInsets.all(16.0),
                decoration: BoxDecoration(
                  color: AppColors.surfaceSecondary, // #F3E2CE
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Lịch hẹn sắp tới',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading, // #693B20
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Massage thư giãn toàn thân',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary, // #40352F
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      '12/10/2026 · 10:00–11:00',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Chi nhánh Quận 3',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF236B42).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        '✓ Đã xác nhận',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF236B42),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      height: 44,
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.primary,
                          side: const BorderSide(color: AppColors.primary),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        onPressed: _showAppointmentDetailSheet,
                        child: const Text(
                          'Xem chi tiết',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // ==========================================
              // 9. ACADEMY PROMO CARD (350x366, r=20, white)
              // ==========================================
              Container(
                decoration: BoxDecoration(
                  color: AppColors.surface, // white
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.border.withValues(alpha: 0.6)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ClipRRect(
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                      child: SizedBox(
                        height: 180,
                        width: double.infinity,
                        child: Image.asset(
                          'assets/images/gioithieu_3.png',
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'HỌC VIỆN ĐÀO TẠO NGHỀ',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary, // #985018
                              letterSpacing: 0.6,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Khởi đầu nghề nghiệp trong lĩnh vực chăm sóc sức khỏe và spa.',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              height: 1.35,
                              color: AppColors.textHeading, // #693B20
                            ),
                          ),
                          const SizedBox(height: 16),
                          SizedBox(
                            width: double.infinity,
                            height: 56,
                            child: OutlinedButton(
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppColors.primary,
                                side: const BorderSide(color: AppColors.primary, width: 1.2),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                              ),
                              onPressed: widget.onNavigateToAcademy,
                              child: const Text(
                                'Khám phá khóa học',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
