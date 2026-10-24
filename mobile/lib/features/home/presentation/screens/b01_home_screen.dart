import '../../../treatment/data/repositories/treatment_repository.dart';
import 'dart:async';
import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/widgets/profile_image_picker.dart';
import '../../../../l10n/app_localizations.dart';
import '../../../booking/data/models/booking_models.dart';
import '../../../booking/data/repositories/booking_repository.dart';
import '../../../booking/presentation/screens/c01_service_selection_screen.dart';
import '../../../booking/presentation/screens/c02_branch_selection_screen.dart';
import '../../../booking/presentation/screens/c10_appointment_detail_screen.dart';
import '../../../membership/data/repositories/membership_repository.dart';
import '../../data/models/home_models.dart';
import '../../data/repositories/mock_home_repository.dart';
import '../../data/repositories/branch_repository.dart';
import '../../data/repositories/service_repository.dart';
import 'b04_search_screen.dart';
import '../../../services/presentation/screens/b03_service_detail_screen.dart';
import '../../../directory/presentation/screens/b05_branch_listing_screen.dart';
import '../../../treatment/presentation/screens/d01_my_packages_screen.dart';
import '../../../treatment/presentation/screens/d09_documents_screen.dart';
import '../../../treatment/presentation/screens/d10_lymph_examination_screen.dart';
import '../../../treatment/presentation/screens/d11_community_screen.dart';
import '../../../treatment/presentation/screens/d08_notifications_screen.dart';
import '../../../../core/services/auth_service.dart';
import '../../../auth/widgets/update_phone_modal.dart';

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
      'title': 'Dẫn lưu bạch huyết MLD – Phục hồi hậu phẫu chuyên sâu',
      'description': 'Tầm soát và điều trị giảm phù nề, tiêu dịch ứ đọng chuẩn y khoa Vodder.',
      'btnText': 'Đăng ký kiểm tra phù nề',
    },
    {
      'image': 'assets/images/gioithieu_2.png',
      'title': 'Trị liệu Y khoa & Chăm sóc sức khỏe toàn diện',
      'description': 'Quy trình phục hồi hệ bạch huyết và giảm đau nhức cùng chuyên viên chuyên môn.',
      'btnText': 'Đặt lịch trị liệu ngay',
    },
    {
      'image': 'assets/images/gioithieu_3.png',
      'title': 'Học viện Đào tạo Nghề MLD & Trị liệu Chuẩn Y Khoa',
      'description': 'Đào tạo thực hành cho người mới bắt đầu và nâng cao chuyên môn cho người làm nghề.',
      'btnText': 'Khám phá khóa đào tạo',
    },
  ];

  final List<Map<String, dynamic>> _shortcuts = [
    {
      'title': 'Đặt lịch',
      'icon': Icons.calendar_month_outlined,
    },
    {
      'title': 'Khám phù MLD',
      'icon': Icons.medical_services_outlined,
    },
    {
      'title': 'Liệu trình',
      'icon': Icons.healing_outlined,
    },
    {
      'title': 'Tài liệu',
      'icon': Icons.menu_book_outlined,
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

  List<Map<String, dynamic>> _suggestedServices = [
    {
      'id': 'srv-001',
      'title': 'Massage thư giãn toàn thân',
      'duration': '60 phút',
      'price': '350.000đ',
      'originalPrice': '450.000đ',
      'hasDiscount': true,
      'description': 'Thả lỏng cơ thể trong không gian yên tĩnh.',
      'image': 'assets/images/gioithieu_1.png',
      'isFavorite': true,
    },
    {
      'id': 'srv-002',
      'title': 'Chăm sóc da chuyên sâu',
      'duration': '90 phút',
      'price': '520.000đ',
      'originalPrice': '650.000đ',
      'hasDiscount': true,
      'description': 'Chăm sóc làn da với quy trình nhẹ nhàng, chu đáo.',
      'image': 'assets/images/gioithieu_2.png',
      'isFavorite': false,
    },
  ];

  @override
  void initState() {
    super.initState();
    _initBranchListener();
    _startHeroTimer();
    _loadSuggestedServices();
    _loadUserProfile();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkPhonePrompt();
    });
  }

  void _initBranchListener() {
    BranchRepository.instance.activeBranchNotifier.addListener(_onActiveBranchChanged);
    final current = BranchRepository.instance.activeBranch;
    if (current != null) {
      _selectedBranch = current.name;
    } else {
      BranchRepository.instance.init().then((_) {
        if (mounted && BranchRepository.instance.activeBranch != null) {
          setState(() {
            _selectedBranch = BranchRepository.instance.activeBranch!.name;
          });
        }
      });
    }
  }

  void _onActiveBranchChanged() {
    if (mounted && BranchRepository.instance.activeBranch != null) {
      setState(() {
        _selectedBranch = BranchRepository.instance.activeBranch!.name;
      });
    }
  }

  Future<void> _loadUserProfile() async {
    if (AuthService.instance.isLoggedIn) {
      try {
        await MembershipRepository.instance.fetchProfile();
        if (mounted) setState(() {});
      } catch (_) {}
    }
  }

  String _getGreetingName() {
    final authName = AuthService.instance.currentDisplayName?.trim();
    final repoName = MembershipRepository.instance.profile.fullName.trim();
    bool isInvalidMock(String s) => s.isEmpty || s == 'Khách hàng MLD' || s == 'Khách hàng' || s == 'Lễ Tân Hoàng Yến' || s == 'Nguyễn Minh Anh';

    String effective = '';
    if (authName != null && !isInvalidMock(authName)) {
      effective = authName;
    } else if (!isInvalidMock(repoName)) {
      effective = repoName;
    }

    if (effective.isEmpty) return 'Bạn';
    return effective.split(' ').last;
  }

  static bool _hasPromptedPhoneThisSession = false;

  void _checkPhonePrompt() {
    if (!_hasPromptedPhoneThisSession &&
        AuthService.instance.isLoggedIn &&
        !AuthService.instance.hasPhoneNumber) {
      _hasPromptedPhoneThisSession = true;
      Future.delayed(const Duration(milliseconds: 600), () {
        if (mounted && !AuthService.instance.hasPhoneNumber) {
          UpdatePhoneModal.show(context, isDismissible: true);
        }
      });
    }
  }

  Future<void> _loadSuggestedServices() async {
    final liveServices = await ServiceRepository.instance.getFeaturedServices();
    if (mounted && liveServices.isNotEmpty) {
      setState(() {
        _suggestedServices = liveServices.map((s) {
          final hasDiscount = s.discountPrice != null && s.discountPrice! < s.price;
          final priceFormatted =
              '${s.displayPrice.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.')}đ';
          final originalPriceFormatted = hasDiscount
              ? '${s.price.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.')}đ'
              : null;
          return {
            'id': s.id,
            'title': s.name,
            'duration': '${s.durationMinutes} phút',
            'price': priceFormatted,
            'originalPrice': originalPriceFormatted,
            'hasDiscount': hasDiscount,
            'description': s.description,
            'image': s.imageUrl,
            'model': s,
            'isFavorite': false,
          };
        }).toList();
      });
    }
  }

  @override
  void deactivate() {
    _heroTimer?.cancel();
    super.deactivate();
  }

  @override
  void dispose() {
    BranchRepository.instance.activeBranchNotifier.removeListener(_onActiveBranchChanged);
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
      final allServices = ServiceRepository.instance.cachedServices.isNotEmpty
          ? ServiceRepository.instance.cachedServices
          : MockHomeRepository.getFeaturedServices();
      try {
        preselectedService = allServices.firstWhere(
          (s) => s.name.toLowerCase().contains(serviceTitle.toLowerCase()) ||
                 serviceTitle.toLowerCase().contains(s.name.toLowerCase()),
        );
      } catch (_) {}
    }

    if (preselectedService != null) {
      // Người dùng đã bấm "Đặt lịch" tại thẻ dịch vụ cụ thể trên Home -> Mở thẳng Bước 2: Chọn Chi nhánh
      final flow = BookingFlowState(
        selectedServices: [preselectedService],
        selectedService: preselectedService,
        selectedBranch: BranchRepository.instance.activeBranch,
      );
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => C02BranchSelectionScreen(flowState: flow),
        ),
      );
    } else {
      // Người dùng bấm icon Shortcut "Đặt lịch" -> Mở Bước 1: Chọn dịch vụ từ đầu
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => C01ServiceSelectionScreen(
            flowState: BookingFlowState(
              selectedBranch: BranchRepository.instance.activeBranch,
            ),
          ),
        ),
      );
    }
  }

  void _showBranchPicker() async {
    List<BranchModel> branches = BranchRepository.instance.cachedBranches;
    if (branches.isEmpty) {
      branches = await BranchRepository.instance.getBranches();
    }
    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (modalContext) {
        final activeId = BranchRepository.instance.activeBranch?.id;
        return SafeArea(
          child: SingleChildScrollView(
            child: Padding(
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
                  ...branches.map((b) {
                    final isSelected = b.id == activeId || b.name == _selectedBranch;
                    return Column(
                      children: [
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(
                            b.name,
                            style: TextStyle(
                              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                              color: isSelected ? AppColors.primary : AppColors.textPrimary,
                            ),
                          ),
                          subtitle: Text(
                            b.address,
                            style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                          ),
                          trailing: isSelected
                              ? const Icon(Icons.check_circle, color: AppColors.primary)
                              : null,
                          onTap: () {
                            BranchRepository.instance.setActiveBranch(b);
                            setState(() {
                              _selectedBranch = b.name;
                            });
                            Navigator.pop(modalContext);
                          },
                        ),
                        const Divider(),
                      ],
                    );
                  }),
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
                        Navigator.pop(modalContext);
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const B05BranchListingScreen()),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Future<void> _showNotificationSheet() async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const D08NotificationsScreen()),
    );
    if (mounted) {
      setState(() {});
    }
  }

  void _showAppointmentDetailSheet(AppointmentItemModel item) {
    final d = item.appointmentDate;
    final dStr = '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return SafeArea(
          child: SingleChildScrollView(
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
                          Text(
                            'Mã lịch hẹn: ${item.bookingCode}',
                            style: const TextStyle(
                              fontSize: 13,
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
                            child: Text(
                              item.status.label,
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF236B42),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        item.serviceName,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textHeading,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Thời gian: ${item.timeSlot}, $dStr',
                        style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Chuyên viên: ${item.specialistName}',
                        style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Địa điểm: ${item.branchName}\n${item.branchAddress}',
                        style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
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
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.primary,
                          side: const BorderSide(color: AppColors.primary),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        onPressed: () {
                          Navigator.pop(context);
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => C10AppointmentDetailScreen(appointmentId: item.id),
                            ),
                          );
                        },
                        child: const Text('Xem toàn bộ lịch trình'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
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
              ],
            ),
          ),
        ),
      );
    },
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

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
                        avatarUrl: MembershipRepository.instance.profile.avatarUrl,
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
                            'Xin chào, ${_getGreetingName()}!',
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
                            if (TreatmentRepository.instance.hasUnreadNotifications)
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

              // --- BANNER CẢNH BÁO BỔ SUNG SỐ ĐIỆN THOẠI (CHO TÀI KHOẢN ĐĂNG NHẬP EMAIL) ---
              ValueListenableBuilder<String?>(
                valueListenable: AuthService.instance.phoneNotifier,
                builder: (context, phone, _) {
                  final hasPhone = (phone != null && phone.trim().isNotEmpty) ||
                      MembershipRepository.instance.profile.phone.trim().isNotEmpty;
                  if (!AuthService.instance.isLoggedIn || hasPhone) {
                    return const SizedBox.shrink();
                  }
                  return Container(
                    margin: const EdgeInsets.only(top: 14, bottom: 4),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF7ED),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFFDBA74), width: 1.0),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            color: const Color(0xFFFED7AA),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(
                            Icons.phone_android_rounded,
                            color: Color(0xFFC2410C),
                            size: 22,
                          ),
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Cập nhật số điện thoại',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF9A3412),
                                ),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Vui lòng cập nhật để nhận thông báo lịch hẹn & bảo mật tài khoản.',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Color(0xFF7C2D12),
                                  height: 1.3,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            elevation: 0,
                            minimumSize: const Size(0, 36),
                          ),
                          onPressed: () => UpdatePhoneModal.show(context),
                          child: const Text('Cập nhật', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                        ),
                      ],
                    ),
                  );
                },
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
                  child: Row(
                    children: [
                      const Icon(
                        Icons.search_rounded,
                        size: 22,
                        color: AppColors.textSecondary,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          l10n?.homeSearchHint ?? 'Tìm dịch vụ, khóa học, chuyên viên...',
                          style: const TextStyle(
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
                                if (_heroBannerIndex == 0) {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(builder: (_) => const D10LymphExaminationScreen()),
                                  );
                                } else if (_heroBannerIndex == 2) {
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
                      } else if (item['title'] == 'Khám phù MLD') {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const D10LymphExaminationScreen()),
                        );
                      } else if (item['title'] == 'Liệu trình' || item['title'] == 'Gói liệu trình') {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const D01MyPackagesScreen()),
                        );
                      } else if (item['title'] == 'Tài liệu') {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const D09DocumentsScreen()),
                        );
                      } else if (item['title'] == 'Khóa học') {
                        widget.onNavigateToAcademy?.call();
                      } else {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const D10LymphExaminationScreen()),
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
                            serviceCode: service['id'] as String?,
                            serviceModel: service['model'] as SpaServiceModel?,
                            title: service['title'] as String,
                            duration: service['duration'] as String,
                            price: service['price'] as String,
                            originalPrice: service['originalPrice'] as String?,
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
                                child: (service['image'] as String).startsWith('http')
                                    ? Image.network(
                                        service['image'] as String,
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, __, ___) => Container(
                                          color: AppColors.surfaceSecondary,
                                          child: const Center(
                                            child: Icon(Icons.spa, size: 48, color: AppColors.primary),
                                          ),
                                        ),
                                      )
                                    : Image.asset(
                                        service['image'] as String,
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, __, ___) => Container(
                                          color: AppColors.surfaceSecondary,
                                          child: const Center(
                                            child: Icon(Icons.spa, size: 48, color: AppColors.primary),
                                          ),
                                        ),
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
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      if (service['hasDiscount'] == true && service['originalPrice'] != null) ...[
                                        Text(
                                          service['originalPrice'] as String,
                                          style: const TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w400,
                                            color: AppColors.textSecondary,
                                            decoration: TextDecoration.lineThrough,
                                          ),
                                        ),
                                        const SizedBox(width: 6),
                                      ],
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
              // 8. LỊCH HẸN SẮP TỚI (Empty state 100% cho tài khoản mới)
              // ==========================================
              Builder(
                builder: (context) {
                  final upcoming = BookingRepository.instance.getUpcomingAppointments();
                  if (upcoming.isEmpty) {
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 24.0),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceSecondary, // #F3E2CE
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.border, width: 1.0),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.calendar_month_outlined, size: 22, color: AppColors.primary),
                              const SizedBox(width: 8),
                              Text(
                                l10n?.upcomingAppointments ?? 'Lịch hẹn sắp tới',
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textHeading,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),
                          Container(
                            width: 60,
                            height: 60,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.primary.withValues(alpha: 0.08),
                                  blurRadius: 10,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: const Icon(
                              Icons.calendar_today_outlined,
                              size: 28,
                              color: AppColors.primary,
                            ),
                          ),
                          const SizedBox(height: 14),
                          Text(
                            l10n?.noUpcomingAppointments ?? 'Bạn chưa có lịch hẹn nào sắp tới',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textHeading,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12.0),
                            child: Text(
                              l10n?.noUpcomingDesc ?? 'Đặt lịch ngay để được đón tiếp và trải nghiệm các dịch vụ chăm sóc sức khỏe & sắc đẹp chu đáo tại MLD.',
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppColors.textSecondary,
                                height: 1.45,
                              ),
                            ),
                          ),
                          const SizedBox(height: 18),
                          SizedBox(
                            width: double.infinity,
                            height: 46,
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                foregroundColor: Colors.white,
                                elevation: 0,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              onPressed: _handleBooking,
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.add_rounded, size: 20),
                                  const SizedBox(width: 6),
                                  Text(
                                    l10n?.bookNow ?? 'Đặt lịch hẹn ngay',
                                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  }

                  final nextApp = upcoming.first;
                  final d = nextApp.appointmentDate;
                  final dStr = '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year} · ${nextApp.timeSlot}';

                  return Container(
                    padding: const EdgeInsets.all(16.0),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceSecondary, // #F3E2CE
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border, width: 1.0),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              l10n?.upcomingAppointments ?? 'Lịch hẹn sắp tới',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textHeading,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFF236B42).withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                nextApp.status.label,
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF236B42),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          nextApp.serviceName,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          dStr,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w400,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          nextApp.branchName,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w400,
                            color: AppColors.textSecondary,
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
                            onPressed: () => _showAppointmentDetailSheet(nextApp),
                            child: Text(
                              l10n?.viewDetails ?? 'Xem chi tiết',
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                },
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
                            'HỌC VIỆN ĐÀO TẠO MLD VIỆT NAM',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary,
                              letterSpacing: 0.6,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Chương trình đào tạo chuẩn Y khoa Vodder Quốc tế',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              height: 1.35,
                              color: AppColors.textHeading,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.surfaceSecondary,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Column(
                              children: [
                                Row(
                                  children: [
                                    Icon(Icons.check_circle, size: 16, color: AppColors.primary),
                                    SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        'Nhóm 1: Người mới bắt đầu làm nghề (Cấp Giấy chứng nhận)',
                                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                                      ),
                                    ),
                                  ],
                                ),
                                SizedBox(height: 6),
                                Row(
                                  children: [
                                    Icon(Icons.check_circle, size: 16, color: AppColors.primary),
                                    SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        'Nhóm 2: Người đang làm nghề nâng cao tay nghề & điều trị',
                                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),
                          SizedBox(
                            width: double.infinity,
                            height: 52,
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                elevation: 0,
                              ),
                              onPressed: widget.onNavigateToAcademy,
                              child: const Text(
                                'Khám phá 2 nhóm khóa đào tạo',
                                style: TextStyle(
                                  fontSize: 15,
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
              const SizedBox(height: 24),

              // ==========================================
              // 10. CỘNG ĐỒNG MLD VIỆT NAM (Điểm 118, 154)
              // ==========================================
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0066B2), Color(0xFF0284C7)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF0066B2).withValues(alpha: 0.25),
                      blurRadius: 14,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.people_alt_outlined, color: Colors.white, size: 22),
                        ),
                        const SizedBox(width: 10),
                        const Text(
                          'CỘNG ĐỒNG MLD VIỆT NAM',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.5,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Chia sẻ trải nghiệm phục hồi & thảo luận cùng chuyên gia Vodder',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        height: 1.35,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Hàng trăm ca lâm sàng phục hồi phù nề sau phẫu thuật, chia sẻ kinh nghiệm hành nghề thực tế từ học viên và bác sĩ.',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.white70,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: const Color(0xFF0066B2),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 0,
                        ),
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const D11CommunityScreen()),
                          );
                        },
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              'Vào diễn đàn cộng đồng',
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                            ),
                            SizedBox(width: 6),
                            Icon(Icons.arrow_forward, size: 16),
                          ],
                        ),
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
