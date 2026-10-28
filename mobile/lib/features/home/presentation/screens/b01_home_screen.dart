import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/services/supabase_data_service.dart';
import '../../../../core/widgets/profile_image_picker.dart';
import '../../../auth/widgets/update_phone_modal.dart';
import '../../../booking/presentation/screens/all_in_one_booking_screen.dart';
import '../../../directory/presentation/screens/b05_branch_listing_screen.dart';
import '../../../membership/data/repositories/membership_repository.dart';
import '../../../treatment/data/repositories/treatment_repository.dart';
import '../../../treatment/presentation/screens/d08_notifications_screen.dart';
import '../../../treatment/presentation/screens/d11_community_screen.dart';
import '../../data/models/home_models.dart';
import '../../data/repositories/branch_repository.dart';
import '../../data/repositories/service_repository.dart';
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
  static final List<Map<String, dynamic>> _defaultBanners = [
    {
      'id': 'default-banner-1',
      'title': 'Dẫn lưu bạch huyết MLD – Phục hồi chuẩn Y khoa Vodder',
      'summary': 'Tầm soát và điều trị giảm phù nề, tiêu dịch ứ đọng chuyên sâu với chuyên gia MLD',
      'image_url': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&fit=crop',
      'category': 'TRI_LIEU',
      'target_link': '/treatment',
      'status': 'PUBLISHED',
    },
    {
      'id': 'default-banner-2',
      'title': 'Học viện Đào tạo Nghề MLD Chuẩn Y Khoa Quốc Tế',
      'summary': 'Chương trình đào tạo thực hành cho người mới bắt đầu và nâng cao tay nghề chuẩn Vodder',
      'image_url': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&fit=crop',
      'category': 'DAO_TAO',
      'target_link': '/academy',
      'status': 'PUBLISHED',
    },
    {
      'id': 'default-banner-3',
      'title': 'Tầm soát & Đánh giá Độ phù nề Hệ Bạch Huyết',
      'summary': 'Thực hiện bài kiểm tra lâm sàng phát hiện sớm nguy cơ phù bạch huyết và tư vấn miễn phí',
      'image_url': 'https://wstvwushpwcdsmhpunvh.supabase.co/storage/v1/object/public/services/thoat_vi_dia_dem_3.webp',
      'category': 'DICH_VU',
      'target_link': '/treatment',
      'status': 'PUBLISHED',
    },
  ];

  List<Map<String, dynamic>> _banners = List.from(_defaultBanners);
  int _currentBannerIndex = 0;
  late final PageController _bannerPageController;
  Timer? _bannerTimer;

  @override
  void initState() {
    super.initState();
    _bannerPageController = PageController();
    _initBranchListener();
    _loadUserProfile();
    _loadCoreServiceFromAdmin();
    _loadBanners();
    _startBannerAutoScroll();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkPhonePrompt();
    });
  }

  Future<void> _loadBanners() async {
    if (!mounted) return;
    try {
      final data = await SupabaseDataService().fetchBanners();
      if (!mounted) return;
      setState(() {
        if (data.isNotEmpty) {
          _banners = data;
        } else if (_banners.isEmpty) {
          _banners = List.from(_defaultBanners);
        }
        if (_currentBannerIndex >= _banners.length) {
          _currentBannerIndex = 0;
        }
      });
      _startBannerAutoScroll();
    } catch (_) {
      if (mounted && _banners.isEmpty) {
        setState(() {
          _banners = List.from(_defaultBanners);
        });
        _startBannerAutoScroll();
      }
    }
  }

  void _startBannerAutoScroll() {
    _bannerTimer?.cancel();
    if (_banners.length <= 1) return;
    try {
      if (WidgetsBinding.instance.runtimeType.toString().contains('TestWidgetsFlutterBinding')) return;
    } catch (_) {}
    _bannerTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (!mounted || !_bannerPageController.hasClients || _banners.isEmpty) return;
      final nextIndex = (_currentBannerIndex + 1) % _banners.length;
      _bannerPageController.animateToPage(
        nextIndex,
        duration: const Duration(milliseconds: 650),
        curve: Curves.easeInOutCubic,
      );
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
    _bannerTimer?.cancel();
    _bannerPageController.dispose();
    BranchRepository.instance.activeBranchNotifier.removeListener(_onActiveBranchChanged);
    super.dispose();
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


  /// Xử lý điều hướng khi bấm vào Banner động
  void _handleBannerTap(Map<String, dynamic> banner) async {
    final targetLink = (banner['target_link'] as String?)?.trim() ?? '';
    if (targetLink.isEmpty) {
      _showBannerDetailModal(context, banner);
      return;
    }

    if (targetLink.startsWith('http://') || targetLink.startsWith('https://')) {
      try {
        final uri = Uri.parse(targetLink);
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } catch (_) {
        if (mounted) _showBannerDetailModal(context, banner);
      }
      return;
    }

    if (targetLink.contains('academy') ||
        targetLink.contains('dao-tao') ||
        targetLink.contains('curriculum') ||
        targetLink.contains('enrollment')) {
      if (widget.onNavigateToAcademy != null) {
        widget.onNavigateToAcademy!.call();
      } else {
        _showBannerDetailModal(context, banner);
      }
      return;
    }

    if (targetLink.contains('treatment') ||
        targetLink.contains('service') ||
        targetLink.contains('tri-lieu') ||
        targetLink.contains('dich-vu')) {
      if (widget.onNavigateToServices != null) {
        widget.onNavigateToServices!.call();
      } else {
        _showBannerDetailModal(context, banner);
      }
      return;
    }

    if (targetLink.contains('booking') || targetLink.contains('dat-lich')) {
      if (widget.onNavigateToBooking != null) {
        widget.onNavigateToBooking!.call();
      } else {
        _handleBooking();
      }
      return;
    }

    _showBannerDetailModal(context, banner);
  }

  /// Modal chi tiết thông tin Banner khi bấm vào
  void _showBannerDetailModal(BuildContext context, Map<String, dynamic> banner) {
    final title = banner['title'] as String? ?? 'Thông tin MLD Việt Nam';
    final summary = banner['summary'] as String? ?? '';
    final contentText = banner['content_text'] as String? ?? '';
    final imageUrl = (banner['image_url'] as String?)?.trim() ?? '';
    final authorName = (banner['author_name'] as String?)?.trim() ?? 'Trung Tâm MLD Việt Nam';
    final targetLink = (banner['target_link'] as String?)?.trim() ?? '';
    final category = (banner['category'] as String?)?.trim() ?? '';

    String categoryLabel = 'THÔNG BÁO Y KHOA';
    if (category == 'DAO_TAO') {
      categoryLabel = 'ĐÀO TẠO';
    } else if (category == 'DICH_VU' || category == 'TRI_LIEU') {
      categoryLabel = 'TRUNG TÂM Y KHOA BẠCH HUYẾT';
    } else if (category == 'KHUYEN_MAI') {
      categoryLabel = 'ƯU ĐÃI ĐẶC QUYỀN';
    } else if (category.isNotEmpty) {
      categoryLabel = category;
    }

    showDialog(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.45),
      builder: (ctx) => BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
        child: Dialog(
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
            side: const BorderSide(color: AppColors.border, width: 1.0),
          ),
          elevation: 16,
          insetPadding: const EdgeInsets.symmetric(horizontal: 22, vertical: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header ảnh với nút đóng
              Stack(
                children: [
                  Container(
                    height: 160,
                    width: double.infinity,
                    clipBehavior: Clip.antiAlias,
                    decoration: const BoxDecoration(
                      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                    ),
                    child: imageUrl.startsWith('http')
                        ? Image.network(
                            imageUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                              decoration: const BoxDecoration(
                                gradient: AppColors.brandGradient,
                              ),
                            ),
                          )
                        : Container(
                            decoration: const BoxDecoration(
                              gradient: AppColors.brandGradient,
                            ),
                          ),
                  ),
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                        gradient: LinearGradient(
                          colors: [
                            Colors.black.withValues(alpha: 0.65),
                            Colors.transparent,
                          ],
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 12,
                    left: 14,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.92),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        categoryLabel,
                        style: const TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 10,
                    right: 10,
                    child: InkWell(
                      onTap: () => Navigator.pop(ctx),
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.5),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.close_rounded, size: 18, color: Colors.white),
                      ),
                    ),
                  ),
                ],
              ),
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                          height: 1.3,
                        ),
                      ),
                      const SizedBox(height: 8),
                      if (summary.isNotEmpty) ...[
                        Text(
                          summary,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF985018),
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 10),
                      ],
                      if (contentText.isNotEmpty && contentText != summary) ...[
                        Text(
                          contentText,
                          style: const TextStyle(
                            fontSize: 12.5,
                            color: AppColors.textSecondary,
                            height: 1.5,
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],
                      Row(
                        children: [
                          const Icon(Icons.verified_user_outlined, size: 14, color: AppColors.primary),
                          const SizedBox(width: 5),
                          Text(
                            authorName,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => Navigator.pop(ctx),
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: AppColors.border),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                padding: const EdgeInsets.symmetric(vertical: 12),
                              ),
                              child: const Text(
                                'Đóng',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ),
                          ),
                          if (targetLink.isNotEmpty) ...[
                            const SizedBox(width: 10),
                            Expanded(
                              flex: 2,
                              child: ElevatedButton(
                                onPressed: () {
                                  Navigator.pop(ctx);
                                  _handleBannerTap(banner);
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  foregroundColor: Colors.white,
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                ),
                                child: Text(
                                  targetLink.contains('academy')
                                      ? 'Xem Đào Tạo'
                                      : targetLink.contains('treatment') || targetLink.contains('service')
                                          ? 'Xem Dịch Vụ'
                                          : 'Khám Phá Ngay',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
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
        child: RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () async {
            await Future.wait([
              _loadUserProfile(),
              _loadCoreServiceFromAdmin(),
              _loadBanners(),
            ]);
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
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
                          const Text(
                            'Xin chào,',
                            style: TextStyle(
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
              // (Dynamic Banner Carousel từ Supabase / CMS, fallback offline an toàn)
              // ==========================================
              if (_banners.isNotEmpty) ...[
                Column(
                  children: [
                    SizedBox(
                      height: 160,
                      child: PageView.builder(
                        controller: _bannerPageController,
                        itemCount: _banners.length,
                        onPageChanged: (idx) {
                          if (mounted) {
                            setState(() => _currentBannerIndex = idx);
                          }
                        },
                        itemBuilder: (context, index) {
                          final banner = _banners[index];
                          final title = banner['title'] as String? ?? 'MLD VIỆT NAM';
                          final summary = banner['summary'] as String? ?? 'Dẫn lưu phù bạch huyết chuẩn Y khoa Vodder';
                          final imageUrl = (banner['image_url'] as String?)?.trim() ?? '';
                          final category = (banner['category'] as String?)?.trim() ?? '';
                          final targetLink = (banner['target_link'] as String?)?.trim() ?? '';

                          String categoryLabel = 'TRUNG TÂM Y KHOA BẠCH HUYẾT';
                          if (category == 'DAO_TAO') {
                            categoryLabel = 'ĐÀO TẠO';
                          } else if (category == 'DICH_VU' || category == 'TRI_LIEU') {
                            categoryLabel = 'TRUNG TÂM Y KHOA BẠCH HUYẾT';
                          } else if (category == 'KHUYEN_MAI') {
                            categoryLabel = 'ƯU ĐÃI ĐẶC QUYỀN';
                          } else if (category == 'SU_KIEN') {
                            categoryLabel = 'SỰ KIỆN CHUYÊN NGÀNH';
                          } else if (category.isNotEmpty) {
                            categoryLabel = category;
                          }

                                                    String ctaText = 'Bấm để xem chi tiết';
                          if (targetLink.contains('academy') || targetLink.contains('curriculum') || targetLink.contains('enrollment')) {
                            ctaText = 'Xem khóa đào tạo ngay';
                          } else if (targetLink.contains('treatment') || targetLink.contains('service')) {
                            ctaText = 'Khám phá dịch vụ trị liệu';
                          } else if (targetLink.startsWith('http')) {
                            ctaText = 'Nhấn để truy cập';
                          } else if (targetLink.contains('treatment') || targetLink.contains('service')) {
                            ctaText = 'Khám phá dịch vụ trị liệu →';
                          } else if (targetLink.startsWith('http')) {
                            ctaText = 'Nhấn để truy cập';
                          }

                          return Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 1.0),
                            child: InkWell(
                              onTap: () => _handleBannerTap(banner),
                              borderRadius: BorderRadius.circular(16),
                              child: Container(
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
                                    // 1. Ảnh nền banner (Network với Fallback an toàn)
                                    Positioned.fill(
                                      child: imageUrl.startsWith('http')
                                          ? Image.network(
                                              imageUrl,
                                              fit: BoxFit.cover,
                                              errorBuilder: (_, __, ___) => Container(
                                                decoration: const BoxDecoration(
                                                  gradient: AppColors.brandGradient,
                                                ),
                                              ),
                                            )
                                          : (imageUrl.startsWith('assets/')
                                              ? Image.asset(
                                                  imageUrl,
                                                  fit: BoxFit.cover,
                                                  errorBuilder: (_, __, ___) => Container(
                                                    decoration: const BoxDecoration(
                                                      gradient: AppColors.brandGradient,
                                                    ),
                                                  ),
                                                )
                                              : Container(
                                                  decoration: const BoxDecoration(
                                                    gradient: AppColors.brandGradient,
                                                  ),
                                                )),
                                    ),
                                    // 2. Lớp phủ gradient y khoa sang trọng
                                    Positioned.fill(
                                      child: Container(
                                        decoration: BoxDecoration(
                                          gradient: LinearGradient(
                                            colors: [
                                              const Color(0xFF002A6B).withValues(alpha: 0.90),
                                              const Color(0xFF002A6B).withValues(alpha: 0.48),
                                              Colors.transparent,
                                            ],
                                            stops: const [0.0, 0.70, 1.0],
                                            begin: Alignment.centerLeft,
                                            end: Alignment.centerRight,
                                          ),
                                        ),
                                      ),
                                    ),
                                    // 3. Logo MLD chìm bên phải (Trong suốt, không viền nền trắng)
                                    Positioned(
                                      right: 14,
                                      top: 16,
                                      child: Image.asset(
                                        'assets/images/logo.webp',
                                        height: 32,
                                        fit: BoxFit.contain,
                                        errorBuilder: (_, __, ___) => const Icon(
                                          Icons.spa_rounded,
                                          size: 32,
                                          color: Colors.white24,
                                        ),
                                      ),
                                    ),
                                    // 4. Nội dung Banner
                                    Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 15),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: Colors.white.withValues(alpha: 0.22),
                                              borderRadius: BorderRadius.circular(8),
                                              border: Border.all(
                                                color: Colors.white.withValues(alpha: 0.35),
                                                width: 0.8,
                                              ),
                                            ),
                                            child: Text(
                                              categoryLabel,
                                              style: const TextStyle(
                                                fontSize: 10.5,
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
                                                title,
                                                style: const TextStyle(
                                                  fontSize: 16,
                                                  fontWeight: FontWeight.w800,
                                                  color: Colors.white,
                                                  letterSpacing: 0.3,
                                                  height: 1.25,
                                                ),
                                                maxLines: 2,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                              const SizedBox(height: 3),
                                              Text(
                                                summary,
                                                style: TextStyle(
                                                  fontSize: 12,
                                                  color: Colors.white.withValues(alpha: 0.88),
                                                  height: 1.2,
                                                ),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ],
                                          ),
                                          Row(
                                            children: [
                                              const Icon(Icons.touch_app_outlined, size: 13, color: Colors.white),
                                               const SizedBox(width: 5),
                                               Expanded(
                                                 child: Text(
                                                   ctaText,
                                                   maxLines: 1,
                                                   overflow: TextOverflow.ellipsis,
                                                   style: const TextStyle(
                                                     fontSize: 12,
                                                     color: Colors.white,
                                                     fontWeight: FontWeight.w700,
                                                     decoration: TextDecoration.underline,
                                                   ),
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
                            ),
                          );
                        },
                      ),
                    ),
                    if (_banners.length > 1) ...[
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(_banners.length, (dotIdx) {
                          final isActive = dotIdx == _currentBannerIndex;
                          return GestureDetector(
                            onTap: () {
                              _bannerPageController.animateToPage(
                                dotIdx,
                                duration: const Duration(milliseconds: 350),
                                curve: Curves.easeInOut,
                              );
                            },
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 250),
                              margin: const EdgeInsets.symmetric(horizontal: 3),
                              height: 4.5,
                              width: isActive ? 20 : 6,
                              decoration: BoxDecoration(
                                color: isActive ? AppColors.primary : AppColors.border,
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ),
                          );
                        }),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 18),
              ],

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
                            const Text(
                              'Chi nhánh trị liệu hiện tại',
                              style: TextStyle(fontSize: 12.5, color: AppColors.textSecondary),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _selectedBranch,
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
                        const Expanded(
                          child: Text(
                            'CỘNG ĐỒNG CHUYÊN GIA MLD',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white, letterSpacing: 0.5),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Chia sẻ ca lâm sàng & Hướng dẫn phục hồi Vodder',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white, height: 1.3),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Theo dõi các tài liệu trị liệu và bài viết chuyên môn do đội ngũ Bác sĩ, Giảng viên MLD trực tiếp biên soạn.',
                      style: TextStyle(fontSize: 13.5, color: Colors.white70, height: 1.4),
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
                        child: const Text('Xem bài viết chuyên môn', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
  }
}

