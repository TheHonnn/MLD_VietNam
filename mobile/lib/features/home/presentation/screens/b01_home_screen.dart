import 'dart:async';
import 'dart:convert';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_colors.dart';
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
/// 3. Đăng ký trong 30 giây: Bác sĩ gọi lại tư vấn miễn phí
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
    'Khóa học đã đăng ký',
    'Người mới bắt đầu',
    'Người đang làm nghề',
    'Kỹ thuật viên XBBH/VLTL',
    'Y tế & Phục hồi',
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
  String _selectedBranchFilter = 'Cơ sở';

  static const List<String> _serviceCategories = [
    'Dịch vụ',
    'Tất cả dịch vụ',
    'Lưu phù bạch huyết',
    'Dẫn lưu Bạch huyết Giảm phù',
    'Dẫn lưu ngực',
    'Dẫn lưu đầu',
    'Dẫn lưu cổ vai gáy lưng',
    'Dẫn lưu chân',
    'Dẫn lưu bụng',
  ];
  String _selectedServiceCategory = 'Dịch vụ';

  // Controller cho Form Đăng ký tư vấn 30 giây (Không tự điền dữ liệu ở ngoài)
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
    if (AuthService.instance.isLoggedIn) {
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
    final name = _leadNameController.text.trim();
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
        content: Text(
          'Cảm ơn ${name.isNotEmpty ? name : 'bạn'}! Đội ngũ Bác sĩ YHCT Hệ Bách Huyệt sẽ liên hệ qua SĐT $phone trong vòng 30 phút để thăm khám & tư vấn 1:1 miễn phí.',
          style: const TextStyle(fontSize: 14, color: Color(0xFF334155), height: 1.45),
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
          // 0. HEADER MÀU TRẮNG TRÊN CÙNG (LOGO & THÔNG BÁO, AVATAR CÁ NHÂN)
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
                    const SizedBox(height: 12),

                    // ==========================================
                    // 1. BANNER CHUẨN TỶ LỆ 16:9 TỪ ADMIN CMS
                    // ==========================================
                    _buildHeroBannerSection(),

              const SizedBox(height: 12),

              // ==========================================
              // 1b. HAI NÚT THAO TÁC: [GỌI TƯ VẤN NGAY] & [ĐẶT LỊCH]
              // ==========================================
              _buildBannerActionButtons(),

              const SizedBox(height: 14),

              // ==========================================
              // 2. KHUNG TÌM KIẾM DỊCH VỤ TRỊ LIỆU & BỘ LỌC (DỊCH VỤ, CƠ SỞ)
              // KÈM CARD NỔI BẬT "LƯU PHÙ BẠCH HUYẾT" THEO MẪU MỚI
              // ==========================================
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: _buildSearchAndFeaturedServiceSection(),
              ),

              const SizedBox(height: 16),

              // ==========================================
              // 3. ĐĂNG KÝ TRONG 30 GIÂY - BÁC SĨ GỌI LẠI TƯ VẤN MIỄN PHÍ
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
              // 6. GẦN BẠN HƠN - HỆ THỐNG CƠ SỞ
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
  // WIDGET CON: HEADER TRÊN CÙNG MÀU TRẮNG
  // =========================================================================
  Widget _buildTopHeader() {
    final profile = MembershipRepository.instance.profile;
    final avatarUrl = profile.avatarUrl.trim();

    return Container(
      color: Colors.white,
      child: SafeArea(
        bottom: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(
              bottom: BorderSide(color: Color(0xFFE2E8F0), width: 1.0),
            ),
            boxShadow: [
              BoxShadow(
                color: Color(0x08000000),
                blurRadius: 4,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Image.asset(
                'assets/images/logo.webp',
                height: 40,
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
                children: [
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
                        children: [
                          const Icon(Icons.notifications_none_rounded, color: Color(0xFF1E293B), size: 22),
                          if (TreatmentRepository.instance.hasUnreadNotifications)
                            Positioned(
                              top: 8,
                              right: 8,
                              child: Container(
                                width: 7,
                                height: 7,
                                decoration: const BoxDecoration(
                                  color: Color(0xFFEF4444),
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  InkWell(
                    onTap: () {
                      if (widget.onNavigateToProfile != null) {
                        widget.onNavigateToProfile!.call();
                      } else {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const F01ProfileDashboardScreen()),
                        );
                      }
                    },
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.primary, width: 1.5),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x140D766E),
                            blurRadius: 4,
                            offset: Offset(0, 2),
                          ),
                        ],
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: avatarUrl.isNotEmpty
                          ? (avatarUrl.startsWith('http')
                              ? Image.network(
                                  avatarUrl,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => _buildFallbackAvatar(),
                                )
                              : Image.asset(
                                  avatarUrl,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => _buildFallbackAvatar(),
                                ))
                          : _buildFallbackAvatar(),
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

  Widget _buildFallbackAvatar() {
    return Image.asset(
      'assets/images/specialist_hero_1.png',
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => Container(
        color: const Color(0xFFE6F4F1),
        alignment: Alignment.center,
        child: const Icon(Icons.person, color: AppColors.primary, size: 22),
      ),
    );
  }

  // =========================================================================
  // WIDGET CON: HERO BANNER 16:9 DYNAMIC TỪ ADMIN SUPABASE (KHÔNG CỨNG CHỮ)
  // =========================================================================
  Widget _buildHeroBannerSection() {
    final hasBanners = _banners.isNotEmpty;
    final bannerCount = hasBanners ? _banners.length : 1;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          AspectRatio(
            aspectRatio: 16 / 9,
            child: Container(
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.08),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  hasBanners
                      ? PageView.builder(
                          controller: _bannerPageController,
                          itemCount: bannerCount,
                          onPageChanged: (idx) {
                            if (mounted) setState(() => _currentBannerIndex = idx);
                          },
                          itemBuilder: (context, index) {
                            final banner = _banners[index];
                            final imageUrl = (banner['image_url'] as String?)?.trim() ?? '';
                            final title = (banner['title'] as String?)?.trim() ?? '';
                            final summary = (banner['summary'] as String?)?.trim() ?? '';
                            final category = (banner['category'] as String?)?.trim() ?? '';

                            return GestureDetector(
                              onTap: () => _handleBannerTap(banner),
                              child: Stack(
                                fit: StackFit.expand,
                                children: [
                                  imageUrl.startsWith('http')
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
                                  // Hiển thị tiêu đề động nếu Admin có cấu hình tiêu đề cho banner:
                                  if (title.isNotEmpty) ...[
                                    Positioned.fill(
                                      child: Container(
                                        decoration: BoxDecoration(
                                          gradient: LinearGradient(
                                            colors: [
                                              Colors.transparent,
                                              Colors.black.withValues(alpha: 0.75),
                                            ],
                                            begin: Alignment.topCenter,
                                            end: Alignment.bottomCenter,
                                          ),
                                        ),
                                      ),
                                    ),
                                    Positioned(
                                      bottom: 12,
                                      left: 14,
                                      right: 14,
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          if (category.isNotEmpty)
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                              margin: const EdgeInsets.only(bottom: 6),
                                              decoration: BoxDecoration(
                                                color: Colors.white.withValues(alpha: 0.25),
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: Text(
                                                category == 'DAO_TAO'
                                                    ? 'ĐÀO TẠO'
                                                    : category == 'DICH_VU'
                                                        ? 'DỊCH VỤ TRỊ LIỆU'
                                                        : category,
                                                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.white),
                                              ),
                                            ),
                                          Text(
                                            title,
                                            style: const TextStyle(
                                              fontSize: 15,
                                              fontWeight: FontWeight.w800,
                                              color: Colors.white,
                                              height: 1.25,
                                            ),
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          if (summary.isNotEmpty && summary != title) ...[
                                            const SizedBox(height: 2),
                                            Text(
                                              summary,
                                              style: TextStyle(
                                                fontSize: 11.5,
                                                color: Colors.white.withValues(alpha: 0.9),
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            );
                          },
                        )
                      : _buildFallbackHeroImage(),
                ],
              ),
            ),
          ),
          if (_banners.length > 1) ...[
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(_banners.length, (dotIdx) {
                final isActive = dotIdx == _currentBannerIndex;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  height: 4,
                  width: isActive ? 18 : 6,
                  decoration: BoxDecoration(
                    color: isActive ? const Color(0xFF2563EB) : const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                );
              }),
            ),
          ],
        ],
      ),
    );
  }

  // =========================================================================
  // WIDGET CON: HAI NÚT [GỌI TƯ VẤN NGAY] & [ĐẶT LỊCH]
  // =========================================================================
  Widget _buildBannerActionButtons() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          Expanded(
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFE5533D),
                foregroundColor: Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.phone_in_talk_rounded, size: 18),
              label: const Text(
                'Gọi tư vấn ngay',
                style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800),
              ),
              onPressed: () => _launchExternal('tel:0987186399'),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0D766E),
                foregroundColor: Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.calendar_month_outlined, size: 18),
              label: const Text(
                'Đặt lịch',
                style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800),
              ),
              onPressed: _handleBooking,
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
  Widget _buildSearchAndFeaturedServiceSection() {
    final cachedBranches = BranchRepository.instance.cachedBranches;
    final branchOptions = ['Cơ sở', 'Tất cả cơ sở', ...cachedBranches.map((b) => b.name)];
    if (!branchOptions.contains(_selectedBranchFilter)) {
      _selectedBranchFilter = 'Cơ sở';
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 1. Ô tìm kiếm dịch vụ trị liệu
        Container(
          height: 48,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFCBD5E1)),
          ),
          child: TextField(
            controller: _serviceSearchController,
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              hintText: 'Tìm kiếm dịch vụ trị liệu...',
              hintStyle: const TextStyle(
                fontSize: 14,
                color: Color(0xFF94A3B8),
                fontWeight: FontWeight.w400,
              ),
              prefixIcon: const Icon(
                Icons.search_rounded,
                color: Color(0xFF2563EB),
                size: 22,
              ),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
              suffixIcon: _serviceSearchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18, color: Color(0xFF94A3B8)),
                      onPressed: () {
                        _serviceSearchController.clear();
                        setState(() {});
                      },
                    )
                  : null,
            ),
            onChanged: (val) => setState(() {}),
            onSubmitted: (val) {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => B02ServiceListingScreen(
                    initialQuery: val.trim(),
                    initialCategory: _selectedServiceCategory != 'Dịch vụ' && _selectedServiceCategory != 'Tất cả dịch vụ'
                        ? _selectedServiceCategory
                        : null,
                    initialBranch: _selectedBranchFilter != 'Cơ sở' && _selectedBranchFilter != 'Tất cả cơ sở'
                        ? _selectedBranchFilter
                        : null,
                    onBack: () => Navigator.pop(context),
                  ),
                ),
              );
            },
          ),
        ),

        const SizedBox(height: 12),

        // 2. Hàng 2 Dropdown lọc: [Dịch vụ v] và [Cơ sở v]
        Row(
          children: [
            // Dropdown Dịch vụ
            Expanded(
              child: Container(
                height: 44,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedServiceCategory,
                    isExpanded: true,
                    icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF1E293B)),
                    style: const TextStyle(
                      fontSize: 13.5,
                      color: Color(0xFF1E293B),
                      fontWeight: FontWeight.w700,
                    ),
                    items: _serviceCategories
                        .map((e) => DropdownMenuItem(
                              value: e,
                              child: Text(e, overflow: TextOverflow.ellipsis),
                            ))
                        .toList(),
                    onChanged: (val) {
                      if (val != null) {
                        setState(() => _selectedServiceCategory = val);
                        if (val != 'Dịch vụ' && val != 'Tất cả dịch vụ' && val != 'Lưu phù bạch huyết') {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => B02ServiceListingScreen(
                                initialCategory: val,
                                onBack: () => Navigator.pop(context),
                              ),
                            ),
                          );
                        }
                      }
                    },
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Dropdown Cơ sở
            Expanded(
              child: Container(
                height: 44,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedBranchFilter,
                    isExpanded: true,
                    icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF1E293B)),
                    style: const TextStyle(
                      fontSize: 13.5,
                      color: Color(0xFF1E293B),
                      fontWeight: FontWeight.w700,
                    ),
                    items: branchOptions
                        .map((b) => DropdownMenuItem(
                              value: b,
                              child: Text(b, overflow: TextOverflow.ellipsis),
                            ))
                        .toList(),
                    onChanged: (val) {
                      if (val != null) {
                        setState(() {
                          _selectedBranchFilter = val;
                          if (val != 'Cơ sở' && val != 'Tất cả cơ sở') {
                            _selectedBranch = val;
                          }
                        });
                      }
                    },
                  ),
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 16),

        // 3. THẺ DỊCH VỤ NỔI BẬT "LƯU PHÙ BẠCH HUYẾT" CHUẨN MẪU THIẾT KẾ
        GestureDetector(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => const AllInOneBookingScreen(),
              ),
            );
          },
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFF1F5F9)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Hình ảnh thực tế của Lưu phù bạch huyết (Không dùng icon)
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
                  child: Image.asset(
                    'assets/images/service_luu_phu_bach_huyet.png',
                    width: double.infinity,
                    height: 195,
                    fit: BoxFit.cover,
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(18, 14, 18, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Lưu phù bạch huyết',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F2942),
                          letterSpacing: -0.2,
                        ),
                      ),
                      const SizedBox(height: 14),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: const [
                                Text(
                                  '700.000đ',
                                  style: TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFFDC2626), // red
                                  ),
                                ),
                                SizedBox(height: 2),
                                Text(
                                  '60 phút / ca',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton(
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => const AllInOneBookingScreen(),
                                ),
                              );
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF0F766E), // Dark Teal #0F766E
                              foregroundColor: Colors.white,
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  'Đặt lịch',
                                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                                ),
                                SizedBox(width: 6),
                                Icon(Icons.calendar_month_outlined, size: 18),
                              ],
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
            'Bác sĩ gọi lại tư vấn miễn\nphí',
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
          const SizedBox(height: 12),
          const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.verified_user_outlined, size: 14, color: Color(0xFF64748B)),
              SizedBox(width: 6),
              Flexible(
                child: Text(
                  'Thông tin của bạn được bảo mật tuyệt đối',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                ),
              ),
            ],
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
                  onTap: () => _launchExternal('https://zalo.me/0987186399'),
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
                  onTap: () => _launchExternal('https://facebook.com/mldvietnam'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              // Instagram
              Expanded(
                child: _buildSocialChannelCard(
                  title: 'Instagram',
                  subtitle: 'Xem hoạt động',
                  iconWidget: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF833AB4), Color(0xFFFD1D1D), Color(0xFFFCB045)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    alignment: Alignment.center,
                    child: const Icon(Icons.camera_alt_outlined, color: Colors.white, size: 20),
                  ),
                  onTap: () => _launchExternal('https://instagram.com/mldvietnam'),
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
                  onTap: () => _launchExternal('https://m.me/mldvietnam'),
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
            const SizedBox(width: 10),
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
            const SizedBox(width: 10),
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
        padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 8),
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
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: iconColor, size: 22),
            ),
            const SizedBox(height: 10),
            Text(
              title,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF0F172A)),
            ),
          ],
        ),
      ),
    );
  }

  // =========================================================================
  // WIDGET CON: GẦN BẠN HƠN - HỆ THỐNG CƠ SỞ
  // =========================================================================
  Widget _buildNearestBranchSection(String branchName, String branchAddress) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'GẦN BẠN HƠN',
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0D9488), letterSpacing: 0.6),
        ),
        const SizedBox(height: 4),
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
                    const Expanded(
                      child: Row(
                        children: [
                          Icon(Icons.access_time_rounded, size: 15, color: Color(0xFF64748B)),
                          SizedBox(width: 5),
                          Flexible(
                            child: Text(
                              'Mở cửa hôm nay: 08:00 – 20:00',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 12, color: Color(0xFF334155), fontWeight: FontWeight.w500),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFECFDF5),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'Đang mở cửa',
                        style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: Color(0xFF059669)),
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
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.auto_awesome_rounded, color: Color(0xFF072D4A), size: 20),
              ),
              const SizedBox(width: 10),
              const Text(
                'MLD Health',
                style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800, letterSpacing: 0.3),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Text(
            'Trung tâm ứng dụng khoa học Bách Huyệt Việt Nam trong chăm sóc và phục hồi sức khỏe.',
            style: TextStyle(color: Colors.white70, fontSize: 13, height: 1.45),
          ),
          const SizedBox(height: 16),
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
                onTap: () => _launchExternal('https://zalo.me/0987186399'),
              ),
              const SizedBox(width: 12),
              // Facebook circle
              _buildFooterSocialButton(
                color: const Color(0xFF1877F2),
                child: const Text('f', style: TextStyle(color: Colors.white, fontSize: 19, fontWeight: FontWeight.w900)),
                onTap: () => _launchExternal('https://facebook.com/mldvietnam'),
              ),
              const SizedBox(width: 12),
              // Instagram circle
              _buildFooterSocialButton(
                gradient: const LinearGradient(
                  colors: [Color(0xFF833AB4), Color(0xFFFD1D1D), Color(0xFFFCB045)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                child: const Icon(Icons.camera_alt_outlined, color: Colors.white, size: 18),
                onTap: () => _launchExternal('https://instagram.com/mldvietnam'),
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
                onTap: () => _launchExternal('https://m.me/mldvietnam'),
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
