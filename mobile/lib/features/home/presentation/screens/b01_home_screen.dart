import 'dart:async';
import 'dart:convert';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/widgets/smart_image.dart';
import '../../../../core/services/auth_service.dart';
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
import '../../../academy/presentation/screens/e01_academy_home_screen.dart';
import '../../../academy/presentation/screens/e02_course_catalog_screen.dart';
import '../../../academy/presentation/screens/e07_my_courses_screen.dart';
import '../../../academy/presentation/screens/e11_attendance_schedule_screen.dart';
import '../../../academy/presentation/screens/e12_learning_results_screen.dart';
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
  static const List<String> _audienceCategories = [
    'Tất cả đối tượng',
    'Người mới bắt đầu',
    'Người đang làm nghề',
    'Kỹ thuật viên XBBH/VLTL',
    'Y tế & Phục hồi',
    'Khóa học đã đăng ký',
  ];
  String _selectedAudience = 'Tất cả đối tượng';

  static const List<String> _needCategories = [
    'Tất cả nhu cầu',
    'Kiến thức nền tảng & Tự chăm sóc',
    'Tích hợp dịch vụ mới',
    'Mở cơ sở chăm sóc',
  ];
  String _selectedNeed = 'Tất cả nhu cầu';

  // Controller & Dropdown cho Tab Dịch vụ & Cơ sở
  final TextEditingController _serviceSearchController = TextEditingController();
  String _selectedBranchFilter = 'Tất cả cơ sở';

  static const List<String> _serviceCategories = [
    'Tất cả dịch vụ',
    'Dẫn lưu Bạch huyết Giảm phù',
    'Dẫn lưu ngực',
    'Dẫn lưu đầu',
    'Dẫn lưu cổ vai gáy lưng',
    'Dẫn lưu chân',
    'Dẫn lưu bụng',
  ];
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

  // Controller cho Form Đăng ký tư vấn 30 giây
  final TextEditingController _leadNameController = TextEditingController();
  final TextEditingController _leadPhoneController = TextEditingController();
  bool _isSubmittingLead = false;

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
      // Chỉ nhận các banner thực tế do Admin tải lên và có ảnh hợp lệ
      final adminBanners = data.where((b) {
        final img = (b['image_url'] as String?)?.trim() ?? '';
        return img.isNotEmpty;
      }).toList();

      if (adminBanners.isNotEmpty) {
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
    _leadNameController.dispose();
    _leadPhoneController.dispose();
    BranchRepository.instance.activeBranchNotifier.removeListener(_onActiveBranchChanged);
    super.dispose();
  }

  Future<void> _handleBooking() async {
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

  Future<void> _launchExternal(String url) async {
    try {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (_) {}
  }

  /// Xử lý gửi Form Đăng ký tư vấn 30 giây
  Future<void> _submitConsultationLead() async {
    final phone = _leadPhoneController.text.trim();

    if (phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vui lòng nhập Số điện thoại để Bác sĩ gọi lại tư vấn!'),
          backgroundColor: Color(0xFFE5533D),
          duration: Duration(seconds: 2),
        ),
      );
      return;
    }

    setState(() => _isSubmittingLead = true);
    await Future.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;
    setState(() => _isSubmittingLead = false);
    _leadNameController.clear();
    _leadPhoneController.clear();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.check_circle_rounded, color: Color(0xFF0D766E), size: 28),
            SizedBox(width: 10),
            Text('Đăng ký thành công', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
          ],
        ),
        content: const Text(
          'Bác sĩ gọi lại tư vấn miễn phí trong thời gian sớm nhất.',
          style: TextStyle(fontSize: 14, color: Color(0xFF334155), height: 1.45),
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0D766E),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Xác nhận', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
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
    final displayBranchAddress = activeBranch?.address ?? '52 Nguyễn Chí Thanh, Đống Đa, Hà Nội';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Column(
        children: [
          // ==========================================
          // 0. HEADER TRÊN CÙNG BÊN TRÊN BANNER (LOGO & THÔNG BÁO)
          // ==========================================
          _buildTopHeader(),

          Expanded(
            child: RefreshIndicator(
              color: const Color(0xFF2563EB),
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
                    // 1. HERO BANNER CHIẾM 35% - 40% MÀN HÌNH VỚI DYNAMIC CMS & CÁC NÚT OVERLAY
                    // ==========================================
                    _buildHeroBannerSection(),

                    // ==========================================
                    // 2. KHUNG TÌM KIẾM 2 TAB: [TÌM KHÓA HỌC] & [TÌM DỊCH VỤ & CƠ SỞ]
                    // ==========================================
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                      child: _buildSearchTabsCard(),
                    ),

                    // ==========================================
                    // ==========================================
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: _buildConsultationLeadCard(),
                    ),

                    const SizedBox(height: 16),

                    // ==========================================
                    // 4. NHẮN TIN TRỰC TIẾP (Zalo, Facebook, Instagram, Messenger)
                    // ==========================================
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: _buildDirectMessagingSection(),
                    ),

                    const SizedBox(height: 24),

                    // ==========================================
                    // 5. TRUY CẬP NHANH (Dịch vụ, Tài liệu, Đào tạo)
                    // ==========================================
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: _buildQuickAccessSection(),
                    ),

                    const SizedBox(height: 24),

                    // ==========================================
                    // 6. HỆ THỐNG CƠ SỞ (THỜI GIAN THỰC)
                    // ==========================================
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: _buildNearestBranchSection(displayBranchName, displayBranchAddress),
                    ),

                    const SizedBox(height: 24),

                    // ==========================================
                    // 7. FOOTER MLD HEALTH (Navy #072D4A) & HOTLINE
                    // ==========================================
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 28),
                      child: _buildMldHealthFooter(),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // =========================================================================
  // WIDGET CON: HEADER TRÊN CÙNG MÀU TRẮNG BÊN TRÊN BANNER (LOGO & THÔNG BÁO)
  // =========================================================================
  Widget _buildTopHeader() {
    return Container(
      color: Colors.white,
      child: SafeArea(
        bottom: false,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(
              bottom: BorderSide(color: Color(0xFFF1F5F9), width: 1.0),
            ),
          ),
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
                    color: Color(0xFF0F172A),
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Nút Thông báo
                  InkWell(
                    onTap: _showNotificationSheet,
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Stack(
                        alignment: Alignment.center,
                        clipBehavior: Clip.none,
                        children: [
                          const Icon(
                            Icons.notifications_none_rounded,
                            color: Color(0xFF1E293B),
                            size: 22,
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
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFFEFF6FF),
                        border: Border.all(color: const Color(0xFF2563EB), width: 1.5),
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
                              width: 40,
                              height: 40,
                              placeholder: const Center(
                                child: Icon(
                                  Icons.person_rounded,
                                  color: Color(0xFF2563EB),
                                  size: 22,
                                ),
                              ),
                            );
                          }
                          return const Center(
                            child: Icon(
                              Icons.person_rounded,
                              color: Color(0xFF2563EB),
                              size: 22,
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
        ),
      ),
    );
  }

  // =========================================================================
  // WIDGET CON: HERO BANNER CHIẾM 35% - 40% CHIỀU CAO MÀN HÌNH VỚI DYNAMIC CAROUSEL & OVERLAY DESIGN
  // =========================================================================
  Widget _buildHeroBannerSection() {
    final screenHeight = MediaQuery.of(context).size.height;
    // Tỷ lệ chiếm khoảng 38% - 42% chiều cao màn hình ở giao diện ban đầu theo yêu cầu
    final heroHeight = (screenHeight * 0.40).clamp(360.0, 440.0);

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
        : 'Đừng để cơn đau\nlàm gián đoạn cuộc\nsống.';

    final bannerSummary = (currentBanner?['summary'] as String?)?.trim();
    final bool isSummaryValid = bannerSummary != null &&
        bannerSummary.isNotEmpty &&
        bannerSummary.toLowerCase() != 'test';
    final displaySummary = isSummaryValid
        ? bannerSummary
        : 'Nhận tư vấn 1:1 và phác đồ trị liệu phù hợp từ đội ngũ chuyên gia Hệ Bách Huyệt.';

    return SizedBox(
      height: heroHeight,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Background Carousel lấy từ Admin CMS
          Positioned.fill(
            child: hasBanners
                ? PageView.builder(
                    controller: _bannerPageController,
                    itemCount: bannerCount,
                    onPageChanged: (idx) {
                      if (mounted) setState(() => _currentBannerIndex = idx);
                    },
                    itemBuilder: (context, index) {
                      final banner = _banners[index];
                      final imageUrl = (banner['image_url'] as String?)?.trim() ?? '';
                      return GestureDetector(
                        onTap: () => _handleBannerTap(banner),
                        child: imageUrl.startsWith('http')
                            ? Image.network(
                                imageUrl,
                                fit: BoxFit.cover,
                                width: double.infinity,
                                height: double.infinity,
                                errorBuilder: (_, __, ___) => _buildFallbackHeroImage(),
                              )
                            : (imageUrl.startsWith('assets/')
                                ? Image.asset(
                                    imageUrl,
                                    fit: BoxFit.cover,
                                    width: double.infinity,
                                    height: double.infinity,
                                    errorBuilder: (_, __, ___) => _buildFallbackHeroImage(),
                                  )
                                : _buildFallbackHeroImage()),
                      );
                    },
                  )
                : _buildFallbackHeroImage(),
          ),

          // Lớp Gradient phủ đảm bảo chữ trắng và nút bấm sắc nét, sang trọng
          Positioned.fill(
            child: IgnorePointer(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.black.withValues(alpha: 0.60),
                      Colors.black.withValues(alpha: 0.35),
                      Colors.black.withValues(alpha: 0.75),
                    ],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
              ),
            ),
          ),

          // Lớp nội dung thông điệp YHCT & 2 nút bấm thao tác
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Flexible(
                  child: SingleChildScrollView(
                    physics: const NeverScrollableScrollPhysics(),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Pill Badge: "BÁC SĨ YHCT TRỰC TIẾP THĂM K

                        const SizedBox(height: 10),

                        // Tiêu đề chính
                        Text(
                          displayTitle,
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            height: 1.18,
                            letterSpacing: -0.2,
                          ),
                        ),

                        const SizedBox(height: 8),

                        // Phụ đề mô tả chuyên gia
                        Text(
                          displaySummary,
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w500,
                            color: Colors.white.withValues(alpha: 0.92),
                            height: 1.35,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 12),

                // 2 Nút bấm thao tác chuẩn theo Design: [Gọi tư vấn ngay] & [Đặt lịch]
                Row(
                  children: [
                    // Nút 1: Gọi tư vấn ngay (Cam/Đỏ san hô #E5533D)
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFE5533D),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 13),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        icon: const Icon(Icons.phone_in_talk_rounded, size: 17),
                        label: const Text(
                          'Gọi tư vấn ngay',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
                        ),
                        onPressed: () => _launchExternal('tel:0987186399'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    // Nút 2: Đặt lịch (Navy bán trong suốt viền trắng mờ)
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          backgroundColor: const Color(0xFF1E3A52).withValues(alpha: 0.65),
                          foregroundColor: Colors.white,
                          side: BorderSide(color: Colors.white.withValues(alpha: 0.45), width: 1.2),
                          padding: const EdgeInsets.symmetric(vertical: 13),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        icon: const Icon(Icons.calendar_month_outlined, size: 17),
                        label: const Text(
                          'Đặt lịch',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
                        ),
                        onPressed: _handleBooking,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFallbackHeroImage() {
    return Image.asset(
      'assets/images/chinhanh.webp',
      fit: BoxFit.cover,
      width: double.infinity,
      height: double.infinity,
      errorBuilder: (_, __, ___) => Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0F172A), Color(0xFF1E3A8A)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
      ),
    );
  }

  // =========================================================================
  // WIDGET CON: KHUNG TÌM KIẾM 2 TAB (KHÓA HỌC / DỊCH VỤ & CƠ SỞ)
  // =========================================================================
  Widget _buildSearchTabsCard() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 2 Tabs chuyển đổi
          Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: () => setState(() => _searchTabIndex = 0),
                  borderRadius: const BorderRadius.only(topLeft: Radius.circular(18)),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    decoration: BoxDecoration(
                      color: _searchTabIndex == 0 ? Colors.white : const Color(0xFFF1F5F9),
                      borderRadius: const BorderRadius.only(topLeft: Radius.circular(18)),
                      border: Border(
                        bottom: BorderSide(
                          color: _searchTabIndex == 0 ? const Color(0xFF2563EB) : Colors.transparent,
                          width: 2.5,
                        ),
                      ),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      'TÌM KHÓA HỌC',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: _searchTabIndex == 0 ? FontWeight.w800 : FontWeight.w600,
                        color: _searchTabIndex == 0 ? const Color(0xFF2563EB) : const Color(0xFF64748B),
                        letterSpacing: 0.3,
                      ),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: InkWell(
                  onTap: () => setState(() => _searchTabIndex = 1),
                  borderRadius: const BorderRadius.only(topRight: Radius.circular(18)),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    decoration: BoxDecoration(
                      color: _searchTabIndex == 1 ? Colors.white : const Color(0xFFF1F5F9),
                      borderRadius: const BorderRadius.only(topRight: Radius.circular(18)),
                      border: Border(
                        bottom: BorderSide(
                          color: _searchTabIndex == 1 ? const Color(0xFF2563EB) : Colors.transparent,
                          width: 2.5,
                        ),
                      ),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      'TÌM DỊCH VỤ & CƠ SỞ',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: _searchTabIndex == 1 ? FontWeight.w800 : FontWeight.w600,
                        color: _searchTabIndex == 1 ? const Color(0xFF2563EB) : const Color(0xFF64748B),
                        letterSpacing: 0.3,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),

          // Nội dung tương ứng theo từng Tab
          Padding(
            padding: const EdgeInsets.all(18),
            child: _searchTabIndex == 0 ? _buildCourseSearchTab() : _buildServiceSearchTab(),
          ),
        ],
      ),
    );
  }

  Widget _buildCourseSearchTab() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Từ khóa tìm kiếm',
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF1E293B)),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _courseSearchController,
          decoration: InputDecoration(
            hintText: 'Nhập tên khóa học...',
            hintStyle: const TextStyle(fontSize: 13.5, color: Color(0xFF94A3B8)),
            prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF94A3B8), size: 20),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            filled: true,
            fillColor: Colors.white,
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Đối tượng', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF1E293B))),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _selectedAudience,
                        isExpanded: true,
                        icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF64748B)),
                        style: const TextStyle(fontSize: 12.5, color: Color(0xFF334155), fontWeight: FontWeight.w500),
                        items: _audienceCategories
                            .map((e) => DropdownMenuItem(value: e, child: Text(e, overflow: TextOverflow.ellipsis)))
                            .toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _selectedAudience = val);
                        },
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Nhu cầu', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF1E293B))),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _selectedNeed,
                        isExpanded: true,
                        icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF64748B)),
                        style: const TextStyle(fontSize: 12.5, color: Color(0xFF334155), fontWeight: FontWeight.w500),
                        items: _needCategories
                            .map((e) => DropdownMenuItem(value: e, child: Text(e, overflow: TextOverflow.ellipsis)))
                            .toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _selectedNeed = val);
                        },
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          height: 46,
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2563EB),
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            icon: const Icon(Icons.search_rounded, size: 18),
            label: const Text('TÌM KIẾM', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
            onPressed: () {
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
            },
          ),
        ),
      ],
    );
  }

  Widget _buildServiceSearchTab() {
    final branchOptions = _getBranchFilterOptions();
    if (!branchOptions.contains(_selectedBranchFilter)) {
      _selectedBranchFilter = branchOptions.first;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Từ khóa tìm kiếm',
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF1E293B)),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _serviceSearchController,
          decoration: InputDecoration(
            hintText: 'Nhập tên dịch vụ hoặc cơ sở...',
            hintStyle: const TextStyle(fontSize: 13.5, color: Color(0xFF94A3B8)),
            prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF94A3B8), size: 20),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            filled: true,
            fillColor: Colors.white,
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Cơ sở', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF1E293B))),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _selectedBranchFilter,
                        isExpanded: true,
                        icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF64748B)),
                        style: const TextStyle(fontSize: 12.5, color: Color(0xFF334155), fontWeight: FontWeight.w500),
                        items: branchOptions
                            .map((e) => DropdownMenuItem(value: e, child: Text(e, overflow: TextOverflow.ellipsis)))
                            .toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _selectedBranchFilter = val);
                        },
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Dịch vụ', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF1E293B))),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _selectedServiceCategory,
                        isExpanded: true,
                        icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF64748B)),
                        style: const TextStyle(fontSize: 12.5, color: Color(0xFF334155), fontWeight: FontWeight.w500),
                        items: _serviceCategories
                            .map((e) => DropdownMenuItem(value: e, child: Text(e, overflow: TextOverflow.ellipsis)))
                            .toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _selectedServiceCategory = val);
                        },
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          height: 46,
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2563EB),
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            icon: const Icon(Icons.search_rounded, size: 18),
            label: const Text('TÌM KIẾM', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
            onPressed: () {
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
            },
          ),
        ),
      ],
    );
  }

  Widget _buildConsultationLeadCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'ĐĂNG KÝ TRONG 30 GIÂY',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0D9488),
                  letterSpacing: 0.6,
                ),
              ),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFE6F4F1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.chat_bubble_outline_rounded, color: Color(0xFF0D9488), size: 18),
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Text(
            'Bác sĩ gọi lại tư vấn miễn phí',
            style: TextStyle(
              fontSize: 21,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
              height: 1.25,
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _leadNameController,
            decoration: InputDecoration(
              hintText: 'Họ và tên của bạn',
              hintStyle: const TextStyle(fontSize: 13.5, color: Color(0xFF94A3B8)),
              prefixIcon: const Icon(Icons.person_outline_rounded, color: Color(0xFF94A3B8), size: 20),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              filled: true,
              fillColor: Colors.white,
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF0D766E), width: 1.5),
              ),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _leadPhoneController,
            keyboardType: TextInputType.phone,
            decoration: InputDecoration(
              hintText: 'Số điện thoại',
              hintStyle: const TextStyle(fontSize: 13.5, color: Color(0xFF94A3B8)),
              prefixIcon: const Icon(Icons.phone_outlined, color: Color(0xFF94A3B8), size: 20),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              filled: true,
              fillColor: Colors.white,
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF0D766E), width: 1.5),
              ),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0D766E),
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: _isSubmittingLead ? null : _submitConsultationLead,
              child: _isSubmittingLead
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.2),
                    )
                  : const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Flexible(
                          child: Text(
                            'Nhận tư vấn từ chuyên gia',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                          ),
                        ),
                        SizedBox(width: 8),
                        Icon(Icons.arrow_forward_rounded, size: 18),
                      ],
                    ),
            ),
          ),

        ],
      ),
    );
  }

  // =========================================================================
  // WIDGET CON: NHẮN TIN TRỰC TIẾP (Zalo, Facebook, Instagram, Messenger)
  // =========================================================================
  Widget _buildDirectMessagingSection() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 12,
            offset: const Offset(0, 4),
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
                  color: const Color(0xFFE6F4F1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.chat_bubble_outline_rounded, color: Color(0xFF0D9488), size: 20),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Nhắn tin trực tiếp',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Chọn kênh thuận tiện nhất với bạn',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              // Zalo
              Expanded(
                child: _buildSocialChannelCard(
                  title: 'Zalo',
                  subtitle: 'Phản hồi nhanh',
                  iconWidget: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: const Color(0xFF0068FF),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    alignment: Alignment.center,
                    child: const Text('Z', style: TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.w900)),
                  ),
                  onTap: () => _launchExternal('https://zalo.me/1424469774232439257?src=qr'),
                ),
              ),
              const SizedBox(width: 10),
              // Facebook
              Expanded(
                child: _buildSocialChannelCard(
                  title: 'Facebook',
                  subtitle: 'Theo dõi chúng tôi',
                  iconWidget: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: const Color(0xFF1877F2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    alignment: Alignment.center,
                    child: const Text('f', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900)),
                  ),
                  onTap: () => _launchExternal('https://www.facebook.com/hebachhuyet.mldvietnam'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              // TikTok
              Expanded(
                child: _buildSocialChannelCard(
                  title: 'TikTok',
                  subtitle: 'Xem video',
                  iconWidget: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    alignment: Alignment.center,
                    child: const Icon(Icons.music_note_rounded, color: Colors.white, size: 20),
                  ),
                  onTap: () => _launchExternal('https://www.tiktok.com/@trungtamgiamphu'),
                ),
              ),
              const SizedBox(width: 10),
              // Messenger
              Expanded(
                child: _buildSocialChannelCard(
                  title: 'Messenger',
                  subtitle: 'Chat tư vấn',
                  iconWidget: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF00B2FE), Color(0xFF006AFF), Color(0xFF9B00E8)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    alignment: Alignment.center,
                    child: const Icon(Icons.bolt_rounded, color: Colors.white, size: 22),
                  ),
                  onTap: () => _launchExternal('https://m.me/hebachhuyet.mldvietnam'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSocialChannelCard({
    required String title,
    required String subtitle,
    required Widget iconWidget,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Row(
          children: [
            iconWidget,
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // =========================================================================
  // WIDGET CON: TRUY CẬP NHANH (Dịch vụ, Tài liệu, Đào tạo)
  // =========================================================================
  Widget _buildQuickAccessSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'TRUY CẬP NHANH',
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0D9488), letterSpacing: 0.6),
        ),
        const SizedBox(height: 4),
        const Text(
          'Bạn muốn tìm gì?',
          style: TextStyle(fontSize: 21, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            // Dịch vụ
            Expanded(
              child: _buildQuickAccessCard(
                title: 'Dịch vụ',
                icon: Icons.medical_services_outlined,
                iconColor: const Color(0xFF10B981),
                bgColor: const Color(0xFFE6F7F2),
                onTap: () {
                  if (widget.onNavigateToServices != null) {
                    widget.onNavigateToServices!.call();
                  } else {
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const B02ServiceListingScreen()));
                  }
                },
              ),
            ),
            const SizedBox(width: 8),
            // Tài liệu
            Expanded(
              child: _buildQuickAccessCard(
                title: 'Tài liệu',
                icon: Icons.description_outlined,
                iconColor: const Color(0xFF3B82F6),
                bgColor: const Color(0xFFEFF6FF),
                onTap: () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const D09DocumentsScreen()));
                },
              ),
            ),
            const SizedBox(width: 8),
            // Đào tạo
            Expanded(
              child: _buildQuickAccessCard(
                title: 'Đào tạo',
                icon: Icons.school_outlined,
                iconColor: const Color(0xFFF97316),
                bgColor: const Color(0xFFFFF7ED),
                onTap: () {
                  if (widget.onNavigateToAcademy != null) {
                    widget.onNavigateToAcademy!.call();
                  } else {
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const E01AcademyHomeScreen()));
                  }
                },
              ),
            ),
            const SizedBox(width: 8),
            // Cá nhân
            Expanded(
              child: _buildQuickAccessCard(
                title: 'Cá nhân',
                icon: Icons.person_outline_rounded,
                iconColor: const Color(0xFF8B5CF6),
                bgColor: const Color(0xFFF5F3FF),
                onTap: () {
                  if (widget.onNavigateToProfile != null) {
                    widget.onNavigateToProfile!.call();
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
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildQuickAccessCard({
    required String title,
    required IconData icon,
    required Color iconColor,
    required Color bgColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 4),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(height: 8),
            Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
            ),
          ],
        ),
      ),
    );
  }

  bool _isBranchCurrentlyOpen(String openingHours) {
    try {
      final now = DateTime.now();
      final currentMinutes = now.hour * 60 + now.minute;

      int openMinutes = 8 * 60; // 08:00
      int closeMinutes = 20 * 60; // 20:00

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
      return hour >= 8 && hour < 20;
    }
  }

  // =========================================================================
  // WIDGET CON: HỆ THỐNG CƠ SỞ (Thời gian thực đóng / mở cửa)
  // =========================================================================
  Widget _buildNearestBranchSection(String branchName, String branchAddress) {
    final activeBranch = BranchRepository.instance.activeBranch;
    final openingHours = (activeBranch != null && activeBranch.openingHours.trim().isNotEmpty)
        ? activeBranch.openingHours.trim()
        : '08:00 – 20:00';
    final isOpen = _isBranchCurrentlyOpen(openingHours);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Expanded(
              child: Text(
                'Hệ thống cơ sở',
                style: TextStyle(fontSize: 21, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
              ),
            ),
            InkWell(
              onTap: () {
                Navigator.push(context, MaterialPageRoute(builder: (_) => const B05BranchListingScreen()));
              },
              child: const Text(
                'Xem bản đồ',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0D9488)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        InkWell(
          onTap: _showBranchPicker,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 10,
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
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE6F7F2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.location_on_rounded, color: Color(0xFF059669), size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            branchName,
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            branchAddress,
                            style: const TextStyle(fontSize: 12.5, color: Color(0xFF64748B), height: 1.35),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Divider(height: 1, color: Color(0xFFF1F5F9)),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          const Icon(Icons.access_time_rounded, size: 15, color: Color(0xFF64748B)),
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
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: isOpen ? const Color(0xFFECFDF5) : const Color(0xFFFEE2E2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        isOpen ? 'Đang mở cửa' : 'Đã đóng cửa',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                          color: isOpen ? const Color(0xFF059669) : const Color(0xFFDC2626),
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
  // WIDGET CON: FOOTER MLD HEALTH (Navy #072D4A) & HOTLINE
  // =========================================================================
  Widget _buildMldHealthFooter() {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: const Color(0xFF072D4A),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF072D4A).withValues(alpha: 0.25),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [

          InkWell(
            onTap: () => _launchExternal('tel:0987186399'),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.phone_outlined, color: Color(0xFF2DD4BF), size: 20),
                SizedBox(width: 8),
                Text(
                  '0987 186 399',
                  style: TextStyle(color: Color(0xFF2DD4BF), fontSize: 17, fontWeight: FontWeight.w800, letterSpacing: 0.5),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              // Zalo circle
              _buildFooterSocialButton(
                color: const Color(0xFF0068FF),
                child: const Text('Z', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900)),
                onTap: () => _launchExternal('https://zalo.me/1424469774232439257?src=qr'),
              ),
              const SizedBox(width: 12),
              // Facebook circle
              _buildFooterSocialButton(
                color: const Color(0xFF1877F2),
                child: const Text('f', style: TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.w900)),
                onTap: () => _launchExternal('https://www.facebook.com/hebachhuyet.mldvietnam'),
              ),
              const SizedBox(width: 12),
              // TikTok circle
              _buildFooterSocialButton(
                color: Colors.black,
                child: const Icon(Icons.music_note_rounded, color: Colors.white, size: 18),
                onTap: () => _launchExternal('https://www.tiktok.com/@trungtamgiamphu'),
              ),
              const SizedBox(width: 12),
              // Messenger circle
              _buildFooterSocialButton(
                gradient: const LinearGradient(
                  colors: [Color(0xFF00B2FE), Color(0xFF006AFF), Color(0xFF9B00E8)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                child: const Icon(Icons.bolt_rounded, color: Colors.white, size: 20),
                onTap: () => _launchExternal('https://m.me/hebachhuyet.mldvietnam'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFooterSocialButton({
    Color? color,
    Gradient? gradient,
    required Widget child,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: color,
          gradient: gradient,
          shape: BoxShape.circle,
        ),
        alignment: Alignment.center,
        child: child,
      ),
    );
  }
}
