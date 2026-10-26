import '../../data/repositories/service_repository.dart';
import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/services/supabase_data_service.dart';
import '../../../../core/widgets/profile_image_picker.dart';
import '../../../academy/presentation/screens/e01_academy_home_screen.dart';
import '../../../auth/widgets/update_phone_modal.dart';
import '../../../booking/presentation/screens/all_in_one_booking_screen.dart';
import '../../../directory/presentation/screens/b05_branch_listing_screen.dart';
import '../../../membership/data/repositories/membership_repository.dart';
import '../../../services/presentation/screens/b02_service_listing_screen.dart';
import '../../../treatment/data/repositories/treatment_repository.dart';
import '../../../treatment/presentation/screens/d08_notifications_screen.dart';
import '../../../treatment/presentation/screens/d11_community_screen.dart';
import '../../data/models/home_models.dart';
import '../../data/repositories/branch_repository.dart';
import '../widgets/vodder_service_card.dart';

/// Màn hình Trang chủ MLD Việt Nam (Mobile-First)
/// Tuân thủ chuẩn đặc tả: Giao diện trang chủ.docx & Website Trang chủ, dịch vụ, đặt lịch.txt
/// Phong cách thiết kế: Modern Medical, Scientific, Clean, Professional (#168477)
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
  String _selectedBranch = 'Trụ sở MLD Việt Nam (5 Master LV3) - Hotline: 096.7786.399';
  SpaServiceModel? _coreService;
  List<BannerPromoModel> _banners = [];
  int _currentBannerIndex = 0;
  late PageController _bannerPageController;
  Timer? _bannerTimer;

  @override
  void initState() {
    super.initState();
    _bannerPageController = PageController();
    _initBranchListener();
    _loadUserProfile();
    _loadCoreServiceFromAdmin();
    _loadBannersFromAdmin();
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

  void _checkPhonePrompt() {
    if (!mounted) return;
    final hasPhone = AuthService.instance.hasPhoneNumber ||
        MembershipRepository.instance.profile.phone.trim().isNotEmpty;
    if (AuthService.instance.isLoggedIn && !hasPhone) {
      UpdatePhoneModal.show(context);
    }
  }

  @override
  void dispose() {
    BranchRepository.instance.activeBranchNotifier.removeListener(_onActiveBranchChanged);
    _bannerTimer?.cancel();
    _bannerPageController.dispose();
    super.dispose();
  }

  Future<void> _loadBannersFromAdmin() async {
    try {
      final raw = await SupabaseDataService.instance.fetchBanners();
      if (!mounted) return;
      if (raw.isNotEmpty) {
        setState(() {
          _banners = raw.map((m) => BannerPromoModel.fromMap(m)).toList();
        });
        _startBannerTimer();
      }
    } catch (_) {}
  }

  void _startBannerTimer() {
    _bannerTimer?.cancel();
    if (_banners.length <= 1) return;
    _bannerTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (!mounted || !_bannerPageController.hasClients) return;
      final next = (_currentBannerIndex + 1) % _banners.length;
      _bannerPageController.animateToPage(
        next,
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOut,
      );
    });
  }

  void _onBannerTap(BannerPromoModel? banner) async {
    final link = banner?.targetLink?.trim() ?? '';
    if (link.startsWith('http://') || link.startsWith('https://')) {
      try {
        await launchUrl(Uri.parse(link), mode: LaunchMode.externalApplication);
      } catch (_) {}
      return;
    }

    if (link == '/academy' || link.contains('academy')) {
      if (widget.onNavigateToAcademy != null) {
        widget.onNavigateToAcademy!();
      } else {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const E01AcademyHomeScreen()),
        );
      }
      return;
    }

    if (link == '/services' || link.contains('services') || link.contains('treatment')) {
      if (widget.onNavigateToServices != null) {
        widget.onNavigateToServices!();
      } else {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const B02ServiceListingScreen()),
        );
      }
      return;
    }

    if (link == '/booking' || link.contains('booking')) {
      if (widget.onNavigateToBooking != null) {
        widget.onNavigateToBooking!();
      } else {
        _handleBooking();
      }
      return;
    }

    _showBannerLinkOptions(context);
  }

  void _handleBooking() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => const AllInOneBookingScreen(),
      ),
    );
  }

  Future<void> _loadCoreServiceFromAdmin() async {
    final srv = await ServiceRepository.instance.getCoreVodderService();
    if (!mounted) return;
    setState(() => _coreService = srv);
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
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Chọn chi nhánh điều trị',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: AppColors.textSecondary),
                      onPressed: () => Navigator.pop(modalContext),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                if (branches.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Center(
                      child: CircularProgressIndicator(color: AppColors.primary),
                    ),
                  )
                else
                  ...branches.map((b) {
                    final isSelected = b.id == activeId || b.name == _selectedBranch;
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      decoration: BoxDecoration(
                        color: isSelected ? AppColors.mintBackground : AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected ? AppColors.primary : AppColors.border,
                          width: isSelected ? 1.5 : 1.0,
                        ),
                      ),
                      child: ListTile(
                        leading: Icon(
                          Icons.location_on_rounded,
                          color: isSelected ? AppColors.primary : AppColors.textSecondary,
                        ),
                        title: Text(
                          b.name,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                            color: isSelected ? AppColors.primaryDark : AppColors.textPrimary,
                          ),
                        ),
                        subtitle: Text(
                          b.address,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        ),
                        trailing: isSelected
                            ? const Icon(Icons.check_circle_rounded, color: AppColors.primary)
                            : null,
                        onTap: () {
                          BranchRepository.instance.setActiveBranch(b);
                          setState(() => _selectedBranch = b.name);
                          Navigator.pop(modalContext);
                        },
                      ),
                    );
                  }),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.primary),
                      foregroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: const Icon(Icons.map_outlined, size: 18),
                    label: const Text('Xem danh sách tất cả cơ sở'),
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

  /// Modal lựa chọn Website / Facebook khi click vào banner ngang trang chủ
  void _showBannerLinkOptions(BuildContext context) {
    showDialog(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.35),
      builder: (ctx) => BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
        child: Dialog(
          backgroundColor: Colors.white.withValues(alpha: 0.96),
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: const BorderSide(color: AppColors.border, width: 1.0),
          ),
          elevation: 12,
          insetPadding: const EdgeInsets.symmetric(horizontal: 28),
          child: Padding(
            padding: const EdgeInsets.all(22),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: AppColors.mintBackground,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.open_in_new_rounded, size: 18, color: AppColors.primary),
                        ),
                        const SizedBox(width: 8),
                        const Text(
                          'Kênh Thông Tin MLD',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, size: 20, color: AppColors.textSecondary),
                      onPressed: () => Navigator.pop(ctx),
                      visualDensity: VisualDensity.compact,
                      padding: EdgeInsets.zero,
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'Chọn cổng thông tin chính thức của Trung tâm MLD Việt Nam để tiếp tục:',
                  style: TextStyle(fontSize: 12, color: AppColors.textSecondary, height: 1.35),
                ),
                const SizedBox(height: 18),
                InkWell(
                  onTap: () async {
                    Navigator.pop(ctx);
                    final uri = Uri.parse('https://mldvietnam.com');
                    try {
                      await launchUrl(uri, mode: LaunchMode.externalApplication);
                    } catch (_) {}
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: AppColors.mintBackground,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.language_rounded, color: AppColors.primary, size: 22),
                        SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Truy cập Website MLD',
                                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'mldvietnam.com - Cổng tin tức & đào tạo',
                                style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                        Icon(Icons.chevron_right_rounded, color: AppColors.primary, size: 20),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                InkWell(
                  onTap: () async {
                    Navigator.pop(ctx);
                    final uri = Uri.parse('https://facebook.com/mldvietnam');
                    try {
                      await launchUrl(uri, mode: LaunchMode.externalApplication);
                    } catch (_) {}
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFBFDBFE)),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.facebook_rounded, color: Color(0xFF1877F2), size: 22),
                        SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Truy cập Facebook Fanpage',
                                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'facebook.com/mldvietnam - Tư vấn trực tiếp',
                                style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                        Icon(Icons.chevron_right_rounded, color: Color(0xFF1877F2), size: 20),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBannerSection() {
    if (_banners.isEmpty) {
      const defaultBanner = BannerPromoModel(
        id: 'default',
        title: 'MLD VIỆT NAM',
        subtitle: 'Dẫn lưu phù bạch huyết chuẩn Y khoa Vodder',
        tag: 'TRUNG TÂM Y KHOA BẠCH HUYẾT',
        ctaText: 'Bấm để xem Website & Facebook chính thức ↗',
        imageUrl: 'assets/images/banner.webp',
      );
      return _buildBannerItem(defaultBanner);
    }

    if (_banners.length == 1) {
      return _buildBannerItem(_banners.first);
    }

    return Column(
      children: [
        SizedBox(
          height: 156,
          child: PageView.builder(
            controller: _bannerPageController,
            onPageChanged: (idx) {
              setState(() => _currentBannerIndex = idx);
            },
            itemCount: _banners.length,
            itemBuilder: (context, index) {
              return _buildBannerItem(_banners[index]);
            },
          ),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(
            _banners.length,
            (index) => AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width: _currentBannerIndex == index ? 20 : 6,
              height: 5,
              decoration: BoxDecoration(
                color: _currentBannerIndex == index
                    ? AppColors.primary
                    : AppColors.primary.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildBannerItem(BannerPromoModel banner) {
    final isNetwork = banner.imageUrl.startsWith('http://') || banner.imageUrl.startsWith('https://');

    return InkWell(
      onTap: () => _onBannerTap(banner),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        height: 156,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.22),
              blurRadius: 14,
              offset: const Offset(0, 5),
            ),
          ],
        ),
        child: Stack(
          children: [
            // 1. Ảnh nền banner (Tự động tải ảnh Admin thêm từ Supabase hoặc dùng ảnh local asset)
            Positioned.fill(
              child: isNetwork
                  ? Image.network(
                      banner.imageUrl,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Image.asset(
                        'assets/images/banner.webp',
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          decoration: const BoxDecoration(
                            gradient: AppColors.brandGradient,
                          ),
                        ),
                      ),
                    )
                  : Image.asset(
                      banner.imageUrl.isNotEmpty ? banner.imageUrl : 'assets/images/banner.webp',
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        decoration: const BoxDecoration(
                          gradient: AppColors.brandGradient,
                        ),
                      ),
                    ),
            ),
            // 2. Lớp phủ gradient #002A6B để chữ luôn hiển thị rõ nét trên mọi ảnh nền
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      const Color(0xFF002A6B).withValues(alpha: 0.86),
                      const Color(0xFF002A6B).withValues(alpha: 0.40),
                      Colors.transparent,
                    ],
                    stops: const [0.0, 0.65, 1.0],
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                  ),
                ),
              ),
            ),
            // 3. Logo MLD Việt Nam góc phải
            Positioned(
              right: 14,
              top: 20,
              child: Image.asset(
                'assets/images/logo.webp',
                width: 70,
                height: 70,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => const Icon(
                  Icons.spa_rounded,
                  size: 50,
                  color: Colors.white24,
                ),
              ),
            ),
            // 4. Nội dung text trên banner
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      context.tr(banner.tag, banner.tag),
                      style: const TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                        letterSpacing: 0.4,
                      ),
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        banner.title.isNotEmpty ? banner.title : 'MLD VIỆT NAM',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        banner.subtitle.isNotEmpty
                            ? context.tr(banner.subtitle, banner.subtitle)
                            : context.tr('Dẫn lưu phù bạch huyết chuẩn Y khoa Vodder', 'Medical Vodder Manual Lymphatic Drainage'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13,
                          color: Colors.white70,
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      const Icon(Icons.touch_app_outlined, size: 13, color: Colors.white),
                      const SizedBox(width: 4),
                      Text(
                        context.tr(banner.ctaText.isNotEmpty ? banner.ctaText : 'Bấm để xem chi tiết ↗', 'Tap to explore ↗'),
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getGreetingName() {
    final profileName = MembershipRepository.instance.profile.fullName.trim();
    if (profileName.isNotEmpty && profileName != 'Khách hàng') {
      return profileName;
    }
    final authName = AuthService.instance.currentDisplayName?.trim();
    if (authName != null && authName.isNotEmpty) {
      return authName;
    }
    return 'Khách hàng MLD';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.only(
            left: 20.0,
            right: 20.0,
            top: 10.0,
            bottom: 32.0,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ==========================================
              // 1. HEADER (Lời chào + Avatar + Chuông thông báo)
              // ==========================================
              SizedBox(
                height: 56,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    InkWell(
                      onTap: widget.onNavigateToProfile,
                      borderRadius: BorderRadius.circular(22),
                      child: AppProfileAvatar(
                        avatarUrl: MembershipRepository.instance.profile.avatarUrl,
                        size: 44,
                        borderWidth: 1.5,
                        borderColor: AppColors.primary,
                        showShadow: false,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            context.tr('Xin chào,', 'Hello,'),
                            style: const TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w400,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _getGreetingName(),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 17.5,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ],
                      ),
                    ),
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
                              size: 24,
                              color: AppColors.primary,
                            ),
                            if (TreatmentRepository.instance.hasUnreadNotifications)
                              Positioned(
                                top: 8,
                                right: 8,
                                child: Container(
                                  width: 8,
                                  height: 8,
                                  decoration: const BoxDecoration(
                                    color: AppColors.error,
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

              // Banner cảnh báo bổ sung SĐT nếu đăng nhập bằng Email
              ValueListenableBuilder<String?>(
                valueListenable: AuthService.instance.phoneNotifier,
                builder: (context, phone, _) {
                  final hasPhone = (phone != null && phone.trim().isNotEmpty) ||
                      MembershipRepository.instance.profile.phone.trim().isNotEmpty;
                  if (!AuthService.instance.isLoggedIn || hasPhone) {
                    return const SizedBox.shrink();
                  }
                  return Container(
                    margin: const EdgeInsets.only(top: 12, bottom: 4),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF7ED),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFFDBA74)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.phone_android_rounded, color: Color(0xFFC2410C), size: 20),
                        const SizedBox(width: 10),
                        const Expanded(
                          child: Text(
                            'Cập nhật SĐT để xác nhận lịch hẹn chính xác',
                            style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: Color(0xFF9A3412)),
                          ),
                        ),
                        TextButton(
                          onPressed: () => UpdatePhoneModal.show(context),
                          style: TextButton.styleFrom(
                            foregroundColor: AppColors.primary,
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            minimumSize: const Size(0, 32),
                          ),
                          child: const Text('Cập nhật', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700)),
                        ),
                      ],
                    ),
                  );
                },
              ),

              const SizedBox(height: 14),

              // ==========================================
              // 2. BANNER NGANG GIỚI THIỆU MLD TRÊN ĐẦU
              // (Đồng bộ động từ Admin Portal / Supabase, hỗ trợ đổi ảnh nền & trượt banner)
              // ==========================================
              _buildBannerSection(),

              const SizedBox(height: 18),

              // ==========================================
              // 3. MỤC CHI NHÁNH ĐANG CHỌN
              // ==========================================
              InkWell(
                onTap: _showBranchPicker,
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.mintBackground,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.location_on_rounded, color: AppColors.primary, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              context.tr('Chi nhánh trị liệu hiện tại', 'Current Therapy Branch'),
                              style: const TextStyle(fontSize: 12.5, color: AppColors.textSecondary),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _selectedBranch.tr(context),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 15.5,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.unfold_more_rounded, color: AppColors.textSecondary, size: 20),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),


              // ==========================================
              // 5. DỊCH VỤ CỐT LÕI DUY NHẤT (Vodder MLD)
              // Thiết kế chuẩn như trang Đào tạo: Ít chữ, không giải thích,
              // chỉ có tên dịch vụ, giá tiền và nút Đặt lịch
              // ==========================================
              VodderServiceCard(
                service: _coreService,
                onBooking: _handleBooking,
              ),

              const SizedBox(height: 18),

              // ==========================================
              // 6. KHỐI CỘNG ĐỒNG Y KHOA MLD
              // ==========================================
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.primaryDark, AppColors.primary],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.18),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.menu_book_outlined, color: Colors.white, size: 16),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          context.tr('CỘNG ĐỒNG CHUYÊN GIA MLD', 'MLD SPECIALIST COMMUNITY'),
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white, letterSpacing: 0.5),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      context.tr('Chia sẻ ca lâm sàng & Hướng dẫn phục hồi Vodder', 'Clinical Case Sharing & Vodder Recovery Guide'),
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white, height: 1.3),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      context.tr('Theo dõi các tài liệu trị liệu và bài viết chuyên môn do đội ngũ Bác sĩ, Giảng viên MLD trực tiếp biên soạn.', 'Follow specialized therapy articles compiled directly by MLD Doctors & Master Trainers.'),
                      style: const TextStyle(fontSize: 13.5, color: Colors.white70, height: 1.4),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 42,
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Colors.white, width: 1.2),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const D11CommunityScreen()),
                          );
                        },
                        child: Text(
                          context.tr('Xem bài viết chuyên môn', 'Read specialized articles'),
                          style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700),
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
