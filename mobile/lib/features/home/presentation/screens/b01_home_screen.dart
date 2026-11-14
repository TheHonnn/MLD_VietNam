import 'dart:async';
import 'dart:convert';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/widgets/guest_auth_prompt.dart';
import '../../../../core/widgets/smart_image.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/services/portal_settings_service.dart';
import '../../../../core/services/supabase_data_service.dart';
import '../../../auth/widgets/update_phone_modal.dart';
import '../../../booking/presentation/screens/all_in_one_booking_screen.dart';
import '../../../booking/presentation/screens/c09_my_appointments_screen.dart';
import '../../../directory/presentation/screens/b05_branch_listing_screen.dart';
import '../../../directory/presentation/screens/b07_specialist_listing_screen.dart';
import '../../../membership/data/repositories/membership_repository.dart';
import '../../../membership/presentation/screens/f01_profile_dashboard_screen.dart';
import '../../../membership/presentation/screens/f02_edit_profile_screen.dart';
import '../../../membership/presentation/screens/f08_settings_screen.dart';
import '../../../treatment/data/repositories/treatment_repository.dart';
import '../../../treatment/presentation/screens/d01_my_packages_screen.dart';
import '../../../treatment/presentation/screens/d03_care_journal_screen.dart';
import '../../../treatment/presentation/screens/d04_pre_service_consultation_screen.dart';
import '../../../treatment/presentation/screens/d05_service_review_screen.dart';
import '../../../treatment/presentation/screens/d06_home_care_guidelines_screen.dart';
import '../../../treatment/presentation/screens/d07_customer_support_screen.dart';
import '../../../treatment/presentation/screens/d08_notifications_screen.dart';
import '../../../treatment/presentation/screens/d09_documents_screen.dart';
import '../../../treatment/presentation/screens/d10_lymph_examination_screen.dart';
import '../../../treatment/presentation/screens/d11_community_screen.dart';
import '../../../academy/presentation/screens/e02_course_catalog_screen.dart';
import '../../../academy/presentation/screens/e07_my_courses_screen.dart';
import '../../../academy/presentation/screens/e11_attendance_schedule_screen.dart';
import '../../../academy/presentation/screens/e12_learning_results_screen.dart';
import '../../../academy/data/repositories/academy_repository.dart';
import '../../../services/presentation/screens/b02_service_listing_screen.dart';
import 'b04_search_screen.dart';
import '../../data/models/home_models.dart';
import '../../data/repositories/branch_repository.dart';
import '../../data/repositories/service_repository.dart';

/// Màn hình Trang chủ MLD Việt Nam (Mobile-First)
/// Thiết kế đồng bộ 100% theo giao diện nhận diện thương hiệu chuẩn MLD:
/// 1. Banner Hero YHCT với 2 nút [Gọi tư vấn ngay] và [Đặt lịch]
/// 2. Khung Tìm kiếm 2 Tab: [Tìm khóa học] & [Tìm dịch vụ & cơ sở]
/// 4. Nhắn tin trực tiếp: Zalo, Facebook, Instagram, Messenger
/// 5. Truy cập nhanh: Dịch vụ, Tài liệu, Đào tạo
/// 6. Gần bạn hơn: Hệ thống cơ sở với định vị chi nhánh & giờ mở cửa
/// 7. Chân trang MLD Health (Navy #072D4A) & Hotline
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
  String _selectedBranch = 'Cơ sở Hà Nội';
  bool _isSocialExpanded = false;
  SpaServiceModel? _coreService;
  SpaServiceModel? get coreService => _coreService;

  // Cache bộ nhớ lưu các banner do Admin đẩy lên từ Supabase/Web Admin.
  static List<Map<String, dynamic>> _cachedAdminBanners = [];

  List<Map<String, dynamic>> _banners = List.from(_cachedAdminBanners);
  int _currentBannerIndex = 0;
  late final PageController _bannerPageController;
  Timer? _bannerTimer;

  // Tab tìm kiếm (0: Khóa học, 1: Dịch vụ & cơ sở)
  int _searchTabIndex = 0;

  // Controller & Dropdown cho Tab Khóa học
  final TextEditingController _courseSearchController = TextEditingController();
  List<String> get _audienceCategories {
    final list = <String>[];
    for (final aud in PortalSettingsService.instance.audienceFilterList) {
      if (!list.contains(aud)) list.add(aud);
    }
    for (final c in AcademyRepository.instance.cachedCourses) {
      final aud = c.targetAudience.trim();
      if (aud.isNotEmpty && aud != 'Tất cả đối tượng' && !list.contains(aud)) {
        list.add(aud);
      }
    }
    if (!list.contains('Khóa học đã đăng ký')) {
      list.add('Khóa học đã đăng ký');
    }
    return list;
  }
  String _selectedAudience = 'Tất cả đối tượng';

  List<String> get _needCategories => PortalSettingsService.instance.needFilterList;
  String _selectedNeed = 'Tất cả nhu cầu';

  // Controller & Dropdown cho Tab Dịch vụ & Cơ sở
  final TextEditingController _serviceSearchController = TextEditingController();
  String _selectedBranchFilter = 'Tất cả cơ sở';

  List<String> get _serviceCategories {
    final list = <String>['Tất cả dịch vụ', 'Dịch vụ lẻ', 'Gói liệu trình'];
    for (final s in ServiceRepository.instance.cachedServices) {
      final name = s.categoryName.trim();
      if (name.isNotEmpty && !list.contains(name)) list.add(name);
    }
    for (final p in ServiceRepository.instance.cachedPackages) {
      final cat = p.category.trim();
      if (cat.isNotEmpty && !list.contains(cat)) list.add(cat);
    }
    return list;
  }
  String _selectedServiceCategory = 'Tất cả dịch vụ';

  List<String> _getBranchFilterOptions() {
    final cached = BranchRepository.instance.cachedBranches;
    final list = <String>['Tất cả cơ sở'];
    if (cached.isNotEmpty) {
      for (final b in cached) {
        if (!list.contains(b.name)) {
          list.add(b.name);
        }
      }
    } else {
      list.addAll(['Cơ sở Hà Nội', 'Cơ sở TP. Hồ Chí Minh']);
    }
    return list;
  }



  @override
  void initState() {
    super.initState();
    _bannerPageController = PageController();
    _initBranchListener();
    _loadUserProfile();
    _loadCoreServiceFromAdmin();
    _initBannersFromLocalCache();
    _loadBanners();
    _startBannerAutoScroll();
    AcademyRepository.instance.getCourses().then((_) {
      if (mounted) setState(() {});
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkPhonePrompt();
    });
  }



  /// Nạp banner Admin đã lưu trong SharedPreferences để hiển thị tức thì khi mở app
  Future<void> _initBannersFromLocalCache() async {
    if (_cachedAdminBanners.isNotEmpty) {
      if (mounted && _banners.isEmpty) {
        setState(() {
          _banners = List.from(_cachedAdminBanners);
        });
      }
      return;
    }
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString('cached_admin_banners');
      if (raw != null && raw.isNotEmpty) {
        final decoded = jsonDecode(raw);
        if (decoded is List) {
          final list = List<Map<String, dynamic>>.from(
            decoded.map((e) => Map<String, dynamic>.from(e as Map)),
          );
          if (list.isNotEmpty) {
            _cachedAdminBanners = list;
            if (mounted && _banners.isEmpty) {
              setState(() {
                _banners = list;
              });
              _startBannerAutoScroll();
            }
          }
        }
      }
    } catch (_) {}
  }

  /// Lấy danh sách banner thực tế do Admin tải lên từ Supabase
  Future<void> _loadBanners() async {
    if (!mounted) return;
    try {
      final data = await SupabaseDataService().fetchBanners();
      if (!mounted) return;
      // Nhận tất cả các banner có tiêu đề hoặc ảnh hợp lệ từ Supabase
      final adminBanners = data.where((b) {
        final title = (b['title'] as String?)?.trim() ?? '';
        final img = (b['image_url'] as String?)?.trim() ?? '';
        return title.isNotEmpty || img.isNotEmpty;
      }).toList();

      _cachedAdminBanners = List.from(adminBanners);
      try {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('cached_admin_banners', jsonEncode(adminBanners));
      } catch (_) {}

      if (mounted) {
        setState(() {
          _banners = List.from(adminBanners);
          if (_currentBannerIndex >= _banners.length) {
            _currentBannerIndex = 0;
          }
        });
        _startBannerAutoScroll();
      }
    } catch (_) {}
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
    if (true) {
      try {
        await MembershipRepository.instance.fetchProfile();
        if (mounted) {
                    setState(() {});
        }
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
    _courseSearchController.dispose();
    _serviceSearchController.dispose();

    BranchRepository.instance.activeBranchNotifier.removeListener(_onActiveBranchChanged);
    super.dispose();
  }

  Future<void> _handleBooking() async {
    final ok = await GuestAuthPrompt.ensureLoggedIn(
      context,
      title: 'Đăng nhập để đặt lịch',
      message: 'Quý khách vui lòng đăng nhập để đặt lịch dịch vụ trị liệu.',
    );
    if (!ok || !mounted) return;

    if (widget.onNavigateToBooking != null) {
      widget.onNavigateToBooking!.call();
    } else {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => const AllInOneBookingScreen(),
        ),
      );
    }
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

  /// Xử lý điều hướng khi bấm vào Banner động từ Admin
  void _handleBannerTap(Map<String, dynamic> banner) async {
    final targetLink = (banner['target_link'] as String?)?.trim() ?? '';
    if (targetLink.isEmpty) {
      _showBannerDetailModal(context, banner);
      return;
    }

    // 1. External URL
    if (targetLink.startsWith('http://') || targetLink.startsWith('https://')) {
      try {
        final uri = Uri.parse(targetLink);
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } catch (_) {
        if (mounted) _showBannerDetailModal(context, banner);
      }
      return;
    }

    // 2. Specific Sub-routes Matching AVAILABLE_BANNER_ROUTES
    if (targetLink == '/documents' || targetLink.contains('tai-lieu') || targetLink.contains('cam-nang')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const D09DocumentsScreen()));
      return;
    }

    if (targetLink == '/community' || targetLink.contains('cong-dong')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const D11CommunityScreen()));
      return;
    }

    if (targetLink == '/notifications' || targetLink.contains('thong-bao')) {
      _showNotificationSheet();
      return;
    }

    if (targetLink == '/home/search' || targetLink.contains('tim-kiem')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const B04SearchScreen()));
      return;
    }

    if (targetLink.startsWith('/branches') || targetLink.contains('chi-nhanh') || targetLink.contains('co-so')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const B05BranchListingScreen()));
      return;
    }

    if (targetLink.startsWith('/specialists') || targetLink.contains('chuyen-vien') || targetLink.contains('chuyen-gia')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const B07SpecialistListingScreen()));
      return;
    }

    if (targetLink == '/treatment/lymph-examination' || targetLink.contains('lymph') || targetLink.contains('tam-soat')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const D10LymphExaminationScreen()));
      return;
    }

    if (targetLink.contains('my-packages') || targetLink.contains('/treatment/packages')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const D01MyPackagesScreen()));
      return;
    }

    if (targetLink.contains('care-journal') || targetLink.contains('nhat-ky') || targetLink == '/treatment/journal') {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const D03CareJournalScreen()));
      return;
    }

    if (targetLink.contains('home-care') || targetLink.contains('tai-nha')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const D06HomeCareGuidelinesScreen()));
      return;
    }

    if (targetLink.contains('consultation') || targetLink.contains('sang-loc')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const D04PreServiceConsultationScreen()));
      return;
    }

    if (targetLink.contains('review') || targetLink.contains('danh-gia')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const D05ServiceReviewScreen()));
      return;
    }

    if (targetLink.contains('/booking/appointments') || targetLink.contains('lich-hen')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const C09MyAppointmentsScreen()));
      return;
    }

    if (targetLink == '/booking' || targetLink.contains('dat-lich')) {
      _handleBooking();
      return;
    }

    // 2.15 Học viện
    if (targetLink.contains('/academy/courses') || targetLink.contains('khoa-hoc')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const E02CourseCatalogScreen()));
      return;
    }
    if (targetLink.contains('/academy/my-courses') || targetLink.contains('lop-cua-toi')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const E07MyCoursesScreen()));
      return;
    }
    if (targetLink.contains('/academy/attendance') || targetLink.contains('diem-danh') || targetLink.contains('lich-hoc')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const E11AttendanceScheduleScreen()));
      return;
    }
    if (targetLink.contains('/academy/results') || targetLink.contains('chung-chi') || targetLink.contains('ket-qua')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const E12LearningResultsScreen()));
      return;
    }
    if (targetLink.contains('/academy/enrollment') || targetLink.contains('ghi-danh') || targetLink.contains('tuyen-sinh')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const E02CourseCatalogScreen()));
      return;
    }

    // 2.16 Hồ sơ cá nhân
    if (targetLink == '/profile/edit' || targetLink.contains('chinh-sua')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const F02EditProfileScreen()));
      return;
    }
    if (targetLink == '/profile/settings' || targetLink.contains('cai-dat')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const F08SettingsScreen()));
      return;
    }
    if (targetLink == '/profile/support' || targetLink.contains('ho-tro')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const D07CustomerSupportScreen()));
      return;
    }

    // 3. Tab-level Navigation Fallbacks
    if (targetLink.contains('academy') || targetLink.contains('dao-tao')) {
      if (widget.onNavigateToAcademy != null) {
        widget.onNavigateToAcademy!.call();
      } else {
        _showBannerDetailModal(context, banner);
      }
      return;
    }

    if (targetLink.contains('treatment') || targetLink.contains('service') || targetLink.contains('tri-lieu') || targetLink.contains('dich-vu')) {
      if (widget.onNavigateToServices != null) {
        widget.onNavigateToServices!.call();
      } else {
        _showBannerDetailModal(context, banner);
      }
      return;
    }

    if (targetLink.contains('profile') || targetLink.contains('tai-khoan') || targetLink.contains('hoi-vien')) {
      if (widget.onNavigateToProfile != null) {
        widget.onNavigateToProfile!.call();
      } else {
        Navigator.push(context, MaterialPageRoute(builder: (_) => const F01ProfileDashboardScreen()));
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
      categoryLabel = 'MLD VIỆT NAM';
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
                                      ? 'Khám Phá Ngay'
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



  @override
  Widget build(BuildContext context) {
    final activeBranch = BranchRepository.instance.activeBranch;
    final displayBranchName = activeBranch?.name ?? _selectedBranch;
    final displayBranchAddress = activeBranch?.address ?? 'Số 260, Ngõ 271 Bùi Xương Trạch, Thanh Xuân, Hà Nội';

    return Scaffold(
      backgroundColor: Colors.white,
      body: RefreshIndicator(
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
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ==========================================
              // 1. HERO BANNER TRÀN LÊN ĐỈNH MÀN HÌNH (GỒM CẢ HEADER ĐỒNG BỘ ẢNH MẪU)
              // ==========================================
              _buildHeroBannerSection(),

              const SizedBox(height: 18),

              // ==========================================
              // 2. KHUNG TÌM KIẾM 2 TAB: [TÌM KHÓA HỌC] & [TÌM DỊCH VỤ & CƠ SỞ]
              // ==========================================
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: _buildSearchTabsCard(),
              ),

              const SizedBox(height: 22),

              // ==========================================
              // 3. KÊNH MẠNG XÃ HỘI Ở GIỮA
              // ==========================================
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: _buildDirectMessagingSection(),
              ),

              const SizedBox(height: 22),

              // ==========================================
              // 4. HỆ THỐNG CƠ SỞ (THỜI GIAN THỰC)
              // ==========================================
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                child: _buildNearestBranchSection(displayBranchName, displayBranchAddress),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // =========================================================================
  // WIDGET CON: HEADER TRÀN TRÊN CÙNG BÊN TRONG HERO BANNER (LOGO & THÔNG BÁO)
  // =========================================================================
  Widget _buildTopHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 6, 18, 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Image.asset(
            'assets/images/logo.webp',
            height: 38,
            fit: BoxFit.contain,
            errorBuilder: (_, __, ___) => const Text(
              'MLD VIETNAM',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: AppColors.primary,
                letterSpacing: 0.5,
              ),
            ),
          ),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Nút Thông báo bo tròn màu trắng đổ bóng nhẹ (chuẩn ảnh mẫu)
              InkWell(
                onTap: _showNotificationSheet,
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.92),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Stack(
                    alignment: Alignment.center,
                    clipBehavior: Clip.none,
                    children: [
                      const Icon(
                        Icons.notifications_none_rounded,
                        color: Color(0xFF1E293B),
                        size: 21,
                      ),
                      if (TreatmentRepository.instance.hasUnreadNotifications)
                        Positioned(
                          top: 8,
                          right: 8,
                          child: Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: const Color(0xFFEF4444),
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 1.5),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 10),
              // Khung tròn ảnh cá nhân (Bấm vào nhảy vào trang cá nhân)
              InkWell(
                onTap: () {
                  if (widget.onNavigateToProfile != null) {
                    widget.onNavigateToProfile!();
                  } else {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => F01ProfileDashboardScreen(
                          onBackToHome: () => Navigator.pop(context),
                        ),
                      ),
                    ).then((_) {
                      if (mounted) setState(() {});
                    });
                  }
                },
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.iceBlue,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.08),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Builder(
                    builder: (context) {
                      final pAvatar = MembershipRepository.instance.profile.avatarUrl.trim();
                      final effectiveAvatar = pAvatar.isNotEmpty
                          ? pAvatar
                          : (AuthService.instance.currentAvatarUrl?.trim() ?? '');
                      if (effectiveAvatar.isNotEmpty) {
                        return SmartImage(
                          imageUrl: effectiveAvatar,
                          fit: BoxFit.cover,
                          width: 38,
                          height: 38,
                          placeholder: const Center(
                            child: Icon(
                              Icons.person_rounded,
                              color: AppColors.primary,
                              size: 20,
                            ),
                          ),
                        );
                      }
                      return const Center(
                        child: Icon(
                          Icons.person_rounded,
                          color: AppColors.primary,
                          size: 20,
                        ),
                      );
                    },
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // =========================================================================
  // 1. WIDGET CON: HERO BANNER TRÀN LÊN ĐỈNH (Đồng bộ chuẩn ảnh mẫu & Database CMS)
  // =========================================================================
  void _onBannerHorizontalSwipe(DragEndDetails details) {
    if (_banners.length <= 1) return;
    if (details.primaryVelocity != null) {
      if (details.primaryVelocity! < -100) {
        // Vuốt sang trái -> banner tiếp theo
        setState(() {
          _currentBannerIndex = (_currentBannerIndex + 1) % _banners.length;
        });
      } else if (details.primaryVelocity! > 100) {
        // Vuốt sang phải -> banner trước đó
        setState(() {
          _currentBannerIndex = (_currentBannerIndex - 1 + _banners.length) % _banners.length;
        });
      }
    }
  }

  Widget _buildFallbackHeroImage() {
    return Image.asset(
      'assets/images/therapy_hero_banner.jpg',
      fit: BoxFit.cover,
      alignment: Alignment.centerLeft,
      errorBuilder: (_, __, ___) => const SizedBox(),
    );
  }

  Widget _buildHeroBannerSection() {
    final screenHeight = MediaQuery.of(context).size.height;
    // Tỷ lệ chiếm 2/5 (40%) chiều cao màn hình theo yêu cầu, tối thiểu 365px để đảm bảo không bị tràn chữ
    final heroHeight = (screenHeight * (2 / 5)).clamp(365.0, 500.0);

    final hasBanners = _banners.isNotEmpty;
    final bannerCount = hasBanners ? _banners.length : 1;
    final currentBanner = hasBanners && _currentBannerIndex < _banners.length
        ? _banners[_currentBannerIndex]
        : null;

    final bannerTitle = (currentBanner?['title'] as String?)?.trim();
    final bool isTitleValid = bannerTitle != null &&
        bannerTitle.isNotEmpty &&
        bannerTitle != 'MLD Banner' &&
        bannerTitle.toLowerCase() != 'test';
    final displayTitle = isTitleValid
        ? bannerTitle
        : 'Chăm sóc đúng cách,\nsống khỏe mỗi ngày';

    final bannerSummary = (currentBanner?['summary'] as String?)?.trim();
    final bool isSummaryValid = bannerSummary != null &&
        bannerSummary.isNotEmpty &&
        bannerSummary.toLowerCase() != 'test';
    final displaySummary = isSummaryValid
        ? bannerSummary
        : 'Đặt lịch trị liệu và tìm khóa học phù hợp với bạn.';

    final imageUrl = (currentBanner?['image_url'] as String?)?.trim() ?? '';

    return Container(
      height: heroHeight,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFFE8F3FC), Color(0xFFD4E8F9)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(28),
          bottomRight: Radius.circular(28),
        ),
      ),
      child: ClipRRect(
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(28),
          bottomRight: Radius.circular(28),
        ),
        child: Stack(
          children: [
            // Ảnh trị liệu massage/banner bên phải tràn lên đỉnh (phía sau Header)
            Positioned(
              right: -10,
              top: 0,
              bottom: 0,
              width: MediaQuery.of(context).size.width * 0.52,
              child: ShaderMask(
                shaderCallback: (rect) => LinearGradient(
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                  colors: [Colors.transparent, Colors.white.withValues(alpha: 0.95)],
                  stops: const [0.0, 0.35],
                ).createShader(rect),
                blendMode: BlendMode.dstIn,
                child: SmartImage(
                  imageUrl: imageUrl.isNotEmpty ? imageUrl : 'assets/images/therapy_hero_banner.jpg',
                  fit: BoxFit.cover,
                  placeholder: _buildFallbackHeroImage(),
                ),
              ),
            ),

            // Lớp nội dung: Header tràn đỉnh + Thông điệp & 2 nút bấm thao tác
            SafeArea(
              bottom: false,
              child: SizedBox(
                height: heroHeight - MediaQuery.of(context).padding.top,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // 1. Header tràn đỉnh màn hình
                    _buildTopHeader(),

                    // 2. Nội dung Banner (hỗ trợ vuốt chuyển banner nếu có nhiều banner từ database)
                    GestureDetector(
                      onHorizontalDragEnd: _onBannerHorizontalSwipe,
                      onTap: currentBanner != null ? () => _handleBannerTap(currentBanner) : null,
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(18, 0, 18, 14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // Huy hiệu danh mục Banner từ Database
                            Builder(
                              builder: (context) {
                                final rawCat = (currentBanner?['category'] as String?)?.trim() ?? '';
                                String catLabel = '';
                                switch (rawCat.toUpperCase()) {
                                  case 'DAO_TAO':
                                    catLabel = 'ĐÀO TẠO Y KHOA';
                                    break;
                                  case 'DICH_VU':
                                    catLabel = 'DỊCH VỤ TRỊ LIỆU';
                                    break;
                                  case 'KHUYEN_MAI':
                                    catLabel = 'ƯU ĐÃI ĐẶC QUYỀN';
                                    break;
                                  case 'SU_KIEN':
                                    catLabel = 'SỰ KIỆN CHUYÊN NGÀNH';
                                    break;
                                  default:
                                    catLabel = rawCat.isNotEmpty ? rawCat.toUpperCase() : '';
                                }
                                if (catLabel.isEmpty) return const SizedBox.shrink();
                                return Container(
                                  margin: const EdgeInsets.only(bottom: 6),
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.stars_rounded, size: 12, color: AppColors.primary),
                                      const SizedBox(width: 4),
                                      Text(
                                        catLabel,
                                        style: const TextStyle(
                                          fontSize: 9.5,
                                          fontWeight: FontWeight.w800,
                                          color: AppColors.primary,
                                          letterSpacing: 0.4,
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),

                            // Tiêu đề chính
                            Text(
                              displayTitle,
                              style: const TextStyle(
                                fontSize: 21,
                                fontWeight: FontWeight.w900,
                                color: AppColors.primary, // 60% MLD Blue tăng tương phản
                                height: 1.25,
                                letterSpacing: -0.3,
                              ),
                            ),
                            const SizedBox(height: 6),
                            // Phụ đề
                            SizedBox(
                              width: 220,
                              child: Text(
                                displaySummary,
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                  color: Color(0xFF475569),
                                  height: 1.35,
                                ),
                              ),
                            ),
                            const SizedBox(height: 14),

                            // 2 Nút thao tác nổi bật khối, không viền, làm điểm nhấn lớn
                            Builder(
                              builder: (context) {
                                final targetLink = (currentBanner?['target_link'] as String?)?.trim() ?? '';
                                String primaryBtnText = 'Đặt lịch trị liệu';
                                if (targetLink.contains('academy') || targetLink.contains('khoa-hoc')) {
                                  primaryBtnText = 'Khám phá ngay';
                                } else if (targetLink.contains('package')) {
                                  primaryBtnText = 'Xem gói bổ trợ';
                                } else if (targetLink.contains('document')) {
                                  primaryBtnText = 'Xem tài liệu';
                                } else if (targetLink.contains('community')) {
                                  primaryBtnText = 'Xem cộng đồng';
                                }

                                return Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  crossAxisAlignment: WrapCrossAlignment.center,
                                  children: [
                                    // Nút 1: Hành động chính của Banner -> (Khối xanh lá nổi bật, đổ bóng 3D nhẹ, không viền)
                                    Container(
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(26),
                                        boxShadow: [
                                          BoxShadow(
                                            color: AppColors.accent.withValues(alpha: 0.32),
                                            blurRadius: 10,
                                            offset: const Offset(0, 4),
                                          ),
                                        ],
                                      ),
                                      child: ElevatedButton(
                                        onPressed: () {
                                          if (currentBanner != null && targetLink.isNotEmpty) {
                                            _handleBannerTap(currentBanner);
                                          } else {
                                            Navigator.push(
                                              context,
                                              MaterialPageRoute(
                                                builder: (_) => const B02ServiceListingScreen(),
                                              ),
                                            );
                                          }
                                        },
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppColors.accent,
                                          foregroundColor: Colors.white,
                                          elevation: 0,
                                          shadowColor: Colors.transparent,
                                          side: BorderSide.none,
                                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10.5),
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Text(
                                              primaryBtnText,
                                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, letterSpacing: -0.2),
                                            ),
                                            const SizedBox(width: 5),
                                            const Icon(Icons.arrow_forward_rounded, size: 15),
                                          ],
                                        ),
                                      ),
                                    ),

                                    // Nút 2: Gọi tư vấn (Khối trắng nổi bật, đổ bóng khối, không viền)
                                    Container(
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(26),
                                        boxShadow: [
                                          BoxShadow(
                                            color: Colors.black.withValues(alpha: 0.08),
                                            blurRadius: 10,
                                            offset: const Offset(0, 4),
                                          ),
                                        ],
                                      ),
                                      child: ElevatedButton(
                                        onPressed: () => _launchExternal('tel:${PortalSettingsService.instance.hotlineSupport.replaceAll(RegExp(r'\D'), '')}'),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: Colors.white,
                                          foregroundColor: AppColors.primary,
                                          elevation: 0,
                                          shadowColor: Colors.transparent,
                                          side: BorderSide.none,
                                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10.5),
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
                                        ),
                                        child: const Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(Icons.phone_in_talk_rounded, size: 14, color: AppColors.primary),
                                            SizedBox(width: 5),
                                            Text(
                                              'Gọi tư vấn',
                                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.primary, letterSpacing: -0.2),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ],
                                );
                              },
                            ),

                            // Chấm chỉ số carousel ở giữa đáy banner (chỉ hiển thị khi có từ 2 banner trở lên)
                            if (bannerCount > 1) ...[
                              const SizedBox(height: 14),
                              Center(
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: List.generate(
                                    bannerCount,
                                    (index) => Container(
                                      margin: const EdgeInsets.symmetric(horizontal: 2.5),
                                      width: index == _currentBannerIndex ? 18 : 5,
                                      height: 5,
                                      decoration: BoxDecoration(
                                        color: index == _currentBannerIndex
                                            ? AppColors.primary
                                            : const Color(0xFF93C5FD),
                                        borderRadius: BorderRadius.circular(index == _currentBannerIndex ? 3 : 2.5),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ],
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
    );
  }

  // =========================================================================
  // 2. WIDGET CON: KHUNG TÌM KIẾM 2 TAB DẠNG PILL (KHÓA HỌC / DỊCH VỤ & CƠ SỞ)
  // =========================================================================
  void _handleSearchSubmit() {
    if (_searchTabIndex == 0) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => E02CourseCatalogScreen(
            initialSearchQuery: _courseSearchController.text.trim().isNotEmpty
                ? _courseSearchController.text.trim()
                : null,
            initialCategory: _selectedAudience != 'Tất cả đối tượng' ? _selectedAudience : null,
            initialNeed: _selectedNeed != 'Tất cả nhu cầu' ? _selectedNeed : null,
          ),
        ),
      );
    } else {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => B02ServiceListingScreen(
            initialQuery: _serviceSearchController.text.trim().isNotEmpty
                ? _serviceSearchController.text.trim()
                : null,
            initialBranch: _selectedBranchFilter != 'Tất cả cơ sở' ? _selectedBranchFilter : null,
            initialCategory: _selectedServiceCategory != 'Tất cả dịch vụ' ? _selectedServiceCategory : null,
          ),
        ),
      );
    }
  }

  Widget _buildSearchTabsCard() {
    final branchOptions = _getBranchFilterOptions();
    if (!branchOptions.contains(_selectedBranchFilter)) {
      _selectedBranchFilter = branchOptions.first;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 2 Pill Tags chuyển đổi gọn nhẹ: TÌM KHÓA HỌC & TÌM DỊCH VỤ & CƠ SỞ
        Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(3),
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(24),
          ),
          child: Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: () => setState(() => _searchTabIndex = 0),
                  borderRadius: BorderRadius.circular(22),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: _searchTabIndex == 0 ? AppColors.primary : Colors.transparent,
                      borderRadius: BorderRadius.circular(22),
                      boxShadow: _searchTabIndex == 0
                          ? [
                              BoxShadow(
                                color: AppColors.primary.withValues(alpha: 0.2),
                                blurRadius: 6,
                                offset: const Offset(0, 2),
                              )
                            ]
                          : null,
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      'TÌM KHÓA HỌC',
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: _searchTabIndex == 0 ? FontWeight.w800 : FontWeight.w600,
                        color: _searchTabIndex == 0 ? Colors.white : const Color(0xFF64748B),
                        letterSpacing: 0.3,
                      ),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: InkWell(
                  onTap: () => setState(() => _searchTabIndex = 1),
                  borderRadius: BorderRadius.circular(22),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: _searchTabIndex == 1 ? AppColors.primary : Colors.transparent,
                      borderRadius: BorderRadius.circular(22),
                      boxShadow: _searchTabIndex == 1
                          ? [
                              BoxShadow(
                                color: AppColors.primary.withValues(alpha: 0.2),
                                blurRadius: 6,
                                offset: const Offset(0, 2),
                              )
                            ]
                          : null,
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      'TÌM DỊCH VỤ & CƠ SỞ',
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: _searchTabIndex == 1 ? FontWeight.w800 : FontWeight.w600,
                        color: _searchTabIndex == 1 ? Colors.white : const Color(0xFF64748B),
                        letterSpacing: 0.3,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),

        // Thanh tìm kiếm dạng Pill bo tròn - BỎ VIỀN, NỔI BẬT KHỐI BẰNG BÓNG MỜ MỎNG
        Container(
          margin: const EdgeInsets.only(bottom: 10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(28),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: TextField(
            controller: _searchTabIndex == 0 ? _courseSearchController : _serviceSearchController,
            textInputAction: TextInputAction.search,
            onSubmitted: (_) => _handleSearchSubmit(),
            style: const TextStyle(fontSize: 13.5, color: Color(0xFF0F172A), fontWeight: FontWeight.w500),
            decoration: InputDecoration(
              hintText: _searchTabIndex == 0 ? 'Nhập tên khóa học...' : 'Nhập tên dịch vụ hoặc cơ sở...',
              hintStyle: const TextStyle(fontSize: 13.5, color: Color(0xFF94A3B8)),
              prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF64748B), size: 22),
              suffixIcon: InkWell(
                onTap: _handleSearchSubmit,
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  margin: const EdgeInsets.all(5),
                  padding: const EdgeInsets.all(6),
                  decoration: const BoxDecoration(
                    color: AppColors.accent, // 30% Green Action
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 16),
                ),
              ),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
          ),
        ),

        // Hộp lọc kép dạng Pill chia đôi thanh lịch - BỎ VIỀN, NỔI BẬT KHỐI BẰNG BÓNG MỜ MỎNG
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Row(
            children: [
              // Segment 1 (Bên trái: Nhu cầu / Dịch vụ)
              Expanded(
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: AppColors.iceBlue,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        _searchTabIndex == 0 ? Icons.assignment_outlined : Icons.spa_outlined,
                        size: 18,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            _searchTabIndex == 0 ? 'Nhu cầu' : 'Dịch vụ',
                            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                          ),
                          DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: _searchTabIndex == 0 ? _selectedNeed : _selectedServiceCategory,
                              isDense: true,
                              isExpanded: true,
                              icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 16, color: Color(0xFF64748B)),
                              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                              items: (_searchTabIndex == 0 ? _needCategories : _serviceCategories)
                                  .map((val) => DropdownMenuItem(value: val, child: Text(val, overflow: TextOverflow.ellipsis)))
                                  .toList(),
                              onChanged: (val) {
                                if (val != null) {
                                  setState(() {
                                    if (_searchTabIndex == 0) {
                                      _selectedNeed = val;
                                    } else {
                                      _selectedServiceCategory = val;
                                    }
                                  });
                                }
                              },
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              // Vạch ngăn cách dọc
              Container(
                width: 1,
                height: 32,
                margin: const EdgeInsets.symmetric(horizontal: 10),
                color: const Color(0xFFE2E8F0),
              ),
              // Segment 2 (Bên phải: Đối tượng / Cơ sở)
              Expanded(
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: AppColors.iceBlue,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        _searchTabIndex == 0 ? Icons.people_outline_rounded : Icons.location_on_outlined,
                        size: 18,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            _searchTabIndex == 0 ? 'Đối tượng' : 'Cơ sở',
                            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                          ),
                          DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: _searchTabIndex == 0
                                  ? (_audienceCategories.contains(_selectedAudience) ? _selectedAudience : _audienceCategories.first)
                                  : (branchOptions.contains(_selectedBranchFilter) ? _selectedBranchFilter : branchOptions.first),
                              isDense: true,
                              isExpanded: true,
                              icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 16, color: Color(0xFF64748B)),
                              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                              items: (_searchTabIndex == 0 ? _audienceCategories : branchOptions)
                                  .map((val) => DropdownMenuItem(value: val, child: Text(val, overflow: TextOverflow.ellipsis)))
                                  .toList(),
                              onChanged: (val) {
                                if (val != null) {
                                  setState(() {
                                    if (_searchTabIndex == 0) {
                                      _selectedAudience = val;
                                    } else {
                                      _selectedBranchFilter = val;
                                    }
                                  });
                                }
                              },
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
      ],
    );
  }

  // =========================================================================
  // 3. WIDGET CON: KÊNH MẠNG XÃ HỘI Ở GIỮA (DÀN 4 RA TRÊN 1 HÀNG)
  // =========================================================================
  Widget _buildDirectMessagingSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Tiêu đề có vạch đứng nhận diện thương hiệu
        Row(
          children: [
            Container(
              width: 3.5,
              height: 16,
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 8),
            const Expanded(
              child: Text(
                'Kết nối với chúng tôi',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
              ),
            ),
            InkWell(
              onTap: () {
                setState(() {
                  _isSocialExpanded = !_isSocialExpanded;
                });
              },
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    _isSocialExpanded ? 'Thu gọn' : 'Xem thêm',
                    style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.primary),
                  ),
                  const SizedBox(width: 2),
                  Icon(
                    _isSocialExpanded ? Icons.keyboard_arrow_up_rounded : Icons.arrow_forward_rounded,
                    size: 14,
                    color: AppColors.primary,
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        // Dàn 4 kênh trên 1 hàng ngang với icon chuẩn nền tảng từ assets/icons (Không viền, bóng mờ mỏng, không ghi chú thừa)
        Row(
          children: [
            // 1. Zalo
            Expanded(
              child: _buildSocialPillCard(
                title: 'Zalo',
                iconWidget: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.asset(
                    'assets/icons/logo-zalo-vector-03.webp',
                    width: 38,
                    height: 38,
                    fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: const Color(0xFF0068FF),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      alignment: Alignment.center,
                      child: const Text('Z', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900)),
                    ),
                  ),
                ),
                onTap: () => _launchExternal('https://zalo.me/1424469774232439257?src=qr'),
              ),
            ),
            const SizedBox(width: 8),
            // 2. Facebook
            Expanded(
              child: _buildSocialPillCard(
                title: 'Facebook',
                iconWidget: Image.asset(
                  'assets/icons/Facebook_Logo_(2019).png',
                  width: 38,
                  height: 38,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: const Color(0xFF1877F2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    alignment: Alignment.center,
                    child: const Text('f', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900)),
                  ),
                ),
                onTap: () => _launchExternal('https://www.facebook.com/hebachhuyet.mldvietnam'),
              ),
            ),
            const SizedBox(width: 8),
            // 3. TikTok
            Expanded(
              child: _buildSocialPillCard(
                title: 'TikTok',
                iconWidget: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.asset(
                    'assets/icons/tiktok.png',
                    width: 38,
                    height: 38,
                    fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: Colors.black,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      alignment: Alignment.center,
                      child: const Icon(Icons.music_note_rounded, color: Colors.white, size: 20),
                    ),
                  ),
                ),
                onTap: () => _launchExternal('https://www.tiktok.com/@trungtamgiamphu'),
              ),
            ),
            const SizedBox(width: 8),
            // 4. Messenger
            Expanded(
              child: _buildSocialPillCard(
                title: 'Messenger',
                iconWidget: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.asset(
                    'assets/icons/mesenger.jpg',
                    width: 38,
                    height: 38,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF00B2FE), Color(0xFF006AFF), Color(0xFF9B00E8)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      alignment: Alignment.center,
                      child: const Icon(Icons.flash_on_rounded, color: Colors.white, size: 20),
                    ),
                  ),
                ),
                onTap: () => _launchExternal('https://m.me/hebachhuyet.mldvietnam'),
              ),
            ),
          ],
        ),

        // Khối nền tảng mở rộng khi Admin có thêm nền tảng (Bấm Xem thêm sẽ đẩy cơ sở xuống)
        AnimatedSize(
          duration: const Duration(milliseconds: 320),
          curve: Curves.easeInOutCubic,
          alignment: Alignment.topCenter,
          child: _isSocialExpanded
              ? Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Row(
                    children: [
                      // 5. YouTube
                      Expanded(
                        child: _buildSocialPillCard(
                          title: 'YouTube',
                          iconWidget: Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              color: const Color(0xFFFF0000),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            alignment: Alignment.center,
                            child: const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 24),
                          ),
                          onTap: () => _launchExternal('https://www.youtube.com/@mldvietnam'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      // 6. Hotline
                      Expanded(
                        child: _buildSocialPillCard(
                          title: 'Hotline',
                          iconWidget: Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              color: AppColors.accent,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            alignment: Alignment.center,
                            child: const Icon(Icons.phone_in_talk_rounded, color: Colors.white, size: 20),
                          ),
                          onTap: () => _launchExternal('tel:0987186399'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      // 7. Website
                      Expanded(
                        child: _buildSocialPillCard(
                          title: 'Website',
                          iconWidget: Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              color: AppColors.primary,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            alignment: Alignment.center,
                            child: const Icon(Icons.language_rounded, color: Colors.white, size: 20),
                          ),
                          onTap: () => _launchExternal('https://mldvietnam.com'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      // 8. Instagram
                      Expanded(
                        child: _buildSocialPillCard(
                          title: 'Instagram',
                          iconWidget: Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFF833AB4), Color(0xFFFD1D1D), Color(0xFFFCB045)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            alignment: Alignment.center,
                            child: const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 20),
                          ),
                          onTap: () => _launchExternal('https://www.instagram.com/mldvietnam'),
                        ),
                      ),
                    ],
                  ),
                )
              : const SizedBox.shrink(),
        ),
      ],
    );
  }

  Widget _buildSocialPillCard({
    required String title,
    required Widget iconWidget,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          // BỎ VIỀN HOÀN TOÀN, NỔI BẬT KHỐI BẰNG BÓNG MỜ MỎNG
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            iconWidget,
            const SizedBox(height: 8),
            Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.beVietnamPro(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF0F172A),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _launchExternal(String url) async {
    try {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (_) {}
  }

  bool _isBranchCurrentlyOpen(String openingHours) {
    try {
      final now = DateTime.now();
      final currentMinutes = now.hour * 60 + now.minute;

      int openMinutes = 8 * 60; // 08:00
      int closeMinutes = 17 * 60 + 30; // 17:30

      final clean = openingHours.replaceAll('–', '-');
      final parts = clean.split('-');
      if (parts.length == 2) {
        final startParts = parts[0].trim().split(':');
        final endParts = parts[1].trim().split(':');
        if (startParts.isNotEmpty && endParts.isNotEmpty) {
          openMinutes = int.parse(startParts[0].trim()) * 60 +
              (startParts.length > 1 ? int.parse(startParts[1].trim()) : 0);
          closeMinutes = int.parse(endParts[0].trim()) * 60 +
              (endParts.length > 1 ? int.parse(endParts[1].trim()) : 0);
        }
      }
      return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    } catch (_) {
      final hour = DateTime.now().hour;
      final minute = DateTime.now().minute;
      final current = hour * 60 + minute;
      return current >= (8 * 60) && current < (17 * 60 + 30);
    }
  }

  // =========================================================================
  // 4. WIDGET CON: HỆ THỐNG CƠ SỞ (Thời gian thực đóng / mở cửa)
  // =========================================================================
  Widget _buildNearestBranchSection(String branchName, String branchAddress) {
    final activeBranch = BranchRepository.instance.activeBranch;
    final openingHours = (activeBranch != null && activeBranch.openingHours.trim().isNotEmpty)
        ? activeBranch.openingHours.trim()
        : '08:00 – 17:30';
    final isOpen = _isBranchCurrentlyOpen(openingHours);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Row(
                children: [
                  Container(
                    width: 3.5,
                    height: 16,
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'Hệ thống cơ sở',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            InkWell(
              onTap: () {
                Navigator.push(context, MaterialPageRoute(builder: (_) => const B05BranchListingScreen()));
              },
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Xem bản đồ',
                    style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.accent),
                  ),
                  SizedBox(width: 2),
                  Icon(Icons.arrow_forward_rounded, size: 14, color: AppColors.accent),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        InkWell(
          onTap: _showBranchPicker,
          borderRadius: BorderRadius.circular(18),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              // BỎ VIỀN HOÀN TOÀN, NỔI BẬT KHỐI BẰNG BÓNG MỜ MỎNG
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 12,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: AppColors.mintBackground,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.location_on_rounded, color: AppColors.accent, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            branchName,
                            style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            branchAddress,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.35),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right_rounded, color: Color(0xFF94A3B8), size: 20),
                  ],
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 10),
                  child: Divider(height: 1, color: Color(0xFFF1F5F9)),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          const Icon(Icons.access_time_rounded, size: 14, color: Color(0xFF64748B)),
                          const SizedBox(width: 5),
                          Expanded(
                            child: Text(
                              'Mở cửa hôm nay: $openingHours',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 12, color: Color(0xFF334155), fontWeight: FontWeight.w500),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: isOpen ? AppColors.mintBackground : const Color(0xFFFEE2E2),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        isOpen ? 'Đang mở cửa' : 'Đã đóng cửa',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: isOpen ? AppColors.accent : const Color(0xFFDC2626),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // =========================================================================
}
 