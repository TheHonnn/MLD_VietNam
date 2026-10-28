import 'dart:async';
import 'dart:convert';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/localization/app_translation.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/services/supabase_data_service.dart';
import '../../../../core/widgets/guest_auth_prompt.dart';
import '../../../../core/widgets/profile_image_picker.dart';
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
  // Cache bộ nhớ lưu các banner do Admin đẩy lên từ Supabase/Web Admin.
  // Đảm bảo khi người dùng chuyển trang/tab, banner của Admin hiển thị ngay lập tức,
  // không bị giật hay nhảy từ bất kỳ ảnh mẫu nào.
  static List<Map<String, dynamic>> _cachedAdminBanners = [];

  List<Map<String, dynamic>> _banners = List.from(_cachedAdminBanners);
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

  Widget _buildFallbackBannerCard(String title, String summary) {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: const BoxDecoration(
        gradient: AppColors.brandGradient,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (title.isNotEmpty)
            Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: Colors.white,
                letterSpacing: 0.3,
                height: 1.25,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          if (summary.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              summary,
              style: TextStyle(
                fontSize: 13,
                color: Colors.white.withValues(alpha: 0.90),
                height: 1.3,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ],
      ),
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

    // 1. External URL (Website, Facebook, Zalo, etc.)
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
    // 2.1 Cẩm nang Y khoa & Tài liệu
    if (targetLink == '/documents' || targetLink.contains('tai-lieu') || targetLink.contains('cam-nang')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const D09DocumentsScreen()));
      return;
    }

    // 2.2 Cộng đồng chuyên gia & Ca lâm sàng
    if (targetLink == '/community' || targetLink.contains('cong-dong')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const D11CommunityScreen()));
      return;
    }

    // 2.3 Hộp thư thông báo
    if (targetLink == '/notifications' || targetLink.contains('thong-bao')) {
      _showNotificationSheet();
      return;
    }

    // 2.4 Tìm kiếm dịch vụ & chuyên khoa
    if (targetLink == '/home/search' || targetLink.contains('tim-kiem')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const B04SearchScreen()));
      return;
    }

    // 2.5 Danh sách Chi nhánh / Cơ sở
    if (targetLink.startsWith('/branches') || targetLink.contains('chi-nhanh') || targetLink.contains('co-so')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const B05BranchListingScreen()));
      return;
    }

    // 2.6 Đội ngũ Kỹ thuật viên & Chuyên gia
    if (targetLink.startsWith('/specialists') || targetLink.contains('chuyen-vien') || targetLink.contains('chuyen-gia')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const B07SpecialistListingScreen()));
      return;
    }

    // 2.7 Tầm soát & Đánh giá Độ phù Hệ Bạch huyết
    if (targetLink == '/treatment/lymph-examination' || targetLink.contains('lymph') || targetLink.contains('tam-soat')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const D10LymphExaminationScreen()));
      return;
    }

    // 2.8 Gói liệu trình trị liệu của tôi
    if (targetLink.contains('my-packages') || targetLink.contains('/treatment/packages')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const D01MyPackagesScreen()));
      return;
    }

    // 2.9 Nhật ký Chăm sóc & Tiến trình Hồi phục
    if (targetLink.contains('care-journal') || targetLink.contains('nhat-ky') || targetLink == '/treatment/journal') {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const D03CareJournalScreen()));
      return;
    }

    // 2.10 Hướng dẫn tự chăm sóc tại nhà
    if (targetLink.contains('home-care') || targetLink.contains('tai-nha')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const D06HomeCareGuidelinesScreen()));
      return;
    }

    // 2.11 Khám sàng lọc & Tư vấn trước trị liệu
    if (targetLink.contains('consultation') || targetLink.contains('sang-loc')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const D04PreServiceConsultationScreen()));
      return;
    }

    // 2.12 Đánh giá & Phản hồi chất lượng ca
    if (targetLink.contains('review') || targetLink.contains('danh-gia')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const D05ServiceReviewScreen()));
      return;
    }

    // 2.13 Danh sách lịch hẹn của tôi
    if (targetLink.contains('/booking/appointments') || targetLink.contains('lich-hen')) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => const C09MyAppointmentsScreen()));
      return;
    }

    // 2.14 Đặt lịch khám & Trị liệu trực tuyến
    if (targetLink == '/booking' || targetLink.contains('dat-lich')) {
      if (widget.onNavigateToBooking != null) {
        widget.onNavigateToBooking!.call();
      } else {
        _handleBooking();
      }
      return;
    }

    // 2.15 Học viện: Các trang con
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

    // 2.16 Hồ sơ cá nhân: Các trang con
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

    // Fallback: Hiện modal chi tiết banner
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
              // 1. HEADER (Logo góc trái, Nút thông báo & Khung cá nhân góc phải)
              // ==========================================
              SizedBox(
                height: 48,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // --- GÓC TRÁI: LOGO MLD VIETNAM ---
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

                    // --- BÊN PHẢI: NÚT THÔNG BÁO & KHUNG TRANG CÁ NHÂN ---
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Nút Chuông thông báo
                        InkWell(
                          onTap: _showNotificationSheet,
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            width: 42,
                            height: 42,
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.border, width: 0.8),
                            ),
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                const Icon(
                                  Icons.notifications_none_rounded,
                                  size: 23,
                                  color: AppColors.primary,
                                ),
                                if (TreatmentRepository.instance.hasUnreadNotifications)
                                  Positioned(
                                    top: 9,
                                    right: 9,
                                    child: Container(
                                      width: 7,
                                      height: 7,
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
                        const SizedBox(width: 10),

                        // Khung Trang cá nhân (Avatar Profile)
                        InkWell(
                          onTap: widget.onNavigateToProfile,
                          borderRadius: BorderRadius.circular(22),
                          child: AppProfileAvatar(
                            avatarUrl: MembershipRepository.instance.profile.avatarUrl,
                            size: 42,
                            borderWidth: 1.5,
                            borderColor: AppColors.primary,
                            showShadow: false,
                          ),
                        ),
                      ],
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
                      height: 220,
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
                          final summary = banner['summary'] as String? ?? '';
                          final imageUrl = (banner['image_url'] as String?)?.trim() ?? '';
                          final hasImage = imageUrl.isNotEmpty;

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
                                      color: AppColors.primary.withValues(alpha: 0.15),
                                      blurRadius: 12,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: hasImage
                                    ? (imageUrl.startsWith('http')
                                        ? Image.network(
                                            imageUrl,
                                            fit: BoxFit.cover,
                                            width: double.infinity,
                                            height: double.infinity,
                                            errorBuilder: (_, __, ___) => _buildFallbackBannerCard(title, summary),
                                          )
                                        : (imageUrl.startsWith('assets/')
                                            ? Image.asset(
                                                imageUrl,
                                                fit: BoxFit.cover,
                                                width: double.infinity,
                                                height: double.infinity,
                                                errorBuilder: (_, __, ___) => _buildFallbackBannerCard(title, summary),
                                              )
                                            : _buildFallbackBannerCard(title, summary)))
                                    : _buildFallbackBannerCard(title, summary),
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
                        child: Text(context.tr('Xem bài viết chuyên môn', 'View Expert Articles'), style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700)),
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

