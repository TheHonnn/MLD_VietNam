import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
import '../../../../core/motion/app_page_transitions.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/widgets/profile_image_picker.dart';
import '../../../auth/presentation/screens/a03_login_screen.dart';
import '../../../home/presentation/screens/main_layout_screen.dart';
import '../../../../core/widgets/guest_auth_prompt.dart';
import '../../../booking/data/repositories/booking_repository.dart';
import '../../../booking/presentation/screens/c09_my_appointments_screen.dart';
import '../../../treatment/data/repositories/treatment_repository.dart';
import '../../../treatment/data/models/treatment_models.dart';
import '../../../treatment/presentation/screens/d01_my_packages_screen.dart';
import '../../../treatment/presentation/screens/d03_care_journal_screen.dart';
import '../../../academy/data/repositories/academy_repository.dart';
import '../../../academy/presentation/screens/e07_my_courses_screen.dart';
import '../../../academy/presentation/screens/e11_attendance_schedule_screen.dart';
import '../../../academy/presentation/screens/e12_learning_results_screen.dart';
import '../../data/models/membership_models.dart';
import '../../data/repositories/membership_repository.dart';
import '../../../../core/services/portal_settings_service.dart';
import 'f02_edit_profile_screen.dart';
import 'f05_my_vouchers_screen.dart';
import 'f08_settings_screen.dart';


/// Screen F01: Trang Cá nhân chuẩn Design System (#2860EB)
/// - Đưa nhóm Dịch vụ & Trị liệu lên trên
/// - Đổi "Chứng chỉ" thành "Chứng nhận"
/// - Xóa toàn bộ chữ giải thích / subtitle thừa
/// - Lấy 100% dữ liệu thực từ database, hiển thị 0 khi chưa có dữ liệu (không mock tĩnh)
class F01ProfileDashboardScreen extends StatefulWidget {
  final VoidCallback? onBackToHome;

  const F01ProfileDashboardScreen({
    super.key,
    this.onBackToHome,
  });

  @override
  State<F01ProfileDashboardScreen> createState() => _F01ProfileDashboardScreenState();
}

class _F01ProfileDashboardScreenState extends State<F01ProfileDashboardScreen> {
  final MembershipRepository _repo = MembershipRepository.instance;
  late UserProfile _profile;

  @override
  void initState() {
    super.initState();
    _profile = _repo.profile;
    AuthService.instance.isLoggedInNotifier.addListener(_onAuthStatusChanged);

    if (AuthService.instance.isAuthenticated && !AuthService.instance.isGuest) {
      _loadData();
    }
  }

  @override
  void dispose() {
    AuthService.instance.isLoggedInNotifier.removeListener(_onAuthStatusChanged);
    super.dispose();
  }

  void _onAuthStatusChanged() {
    if (!mounted) return;
    _refreshProfile();
    if (AuthService.instance.isAuthenticated && !AuthService.instance.isGuest) {
      _loadData();
    }
    setState(() {});
  }

  void _loadData() {
    MembershipRepository.instance.fetchProfile().then((p) {
      if (mounted) {
        setState(() {
          _profile = p;
        });
      }
    }).catchError((_) {});

    BookingRepository.instance.fetchMyAppointments().then((_) {
      if (mounted) setState(() {});
    }).catchError((_) {});

    TreatmentRepository.instance.fetchPackages().then((_) {
      if (mounted) setState(() {});
    }).catchError((_) {});

    AcademyRepository.instance.getMyCourses().then((_) {
      if (mounted) setState(() {});
    }).catchError((_) {});

    MembershipRepository.instance.fetchVouchers().then((_) {
      if (mounted) setState(() {});
    }).catchError((_) {});
  }

  void _refreshProfile() {
    setState(() {
      _profile = _repo.profile;
    });
  }

  void _handleLogout() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          context.tr('Đăng xuất', 'Sign Out'),
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
        ),
        content: Text(
          context.tr('Bạn có chắc chắn muốn đăng xuất khỏi tài khoản hiện tại không?', 'Are you sure you want to sign out from your account?'),
          style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(context.tr('Hủy', 'Cancel'), style: const TextStyle(color: AppColors.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              elevation: 0,
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              BookingRepository.instance.clear();
              TreatmentRepository.instance.clear();
              AcademyRepository.instance.clearEnrolledCourses();
              MembershipRepository.instance.resetProfile();
              await AuthService.instance.logout();
              if (mounted) {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const MainLayoutScreen(initialIndex: 4)),
                  (route) => false,
                );
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Đã đăng xuất. Bạn đang ở chế độ khách.'),
                    duration: Duration(seconds: 2),
                  ),
                );
              }
            },
            child: Text(context.tr('Đăng xuất', 'Sign Out')),
          ),
        ],
      ),
    );
  }

  Future<void> _requireLoginAndRun(
    VoidCallback action, {
    String title = 'Đăng nhập tài khoản',
    String message = 'Quý khách vui lòng đăng nhập để sử dụng tính năng này.',
  }) async {
    final ok = await GuestAuthPrompt.ensureLoggedIn(
      context,
      title: title,
      message: message,
    );
    if (ok && mounted) {
      _refreshProfile();
      setState(() {});
      action();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isUserLoggedIn = AuthService.instance.isAuthenticated && !AuthService.instance.isGuest;

    final displayName = isUserLoggedIn
        ? ((_profile.fullName.trim().isNotEmpty && _profile.fullName != "Khách hàng MLD")
            ? _profile.fullName
            : ((AuthService.instance.currentDisplayName?.trim().isNotEmpty ?? false)
                ? AuthService.instance.currentDisplayName!
                : "Khách hàng MLD"))
        : "Khách hàng MLD";

    final displayPhone = isUserLoggedIn
        ? (_profile.phone.trim().isNotEmpty
            ? _profile.phone
            : (AuthService.instance.lastLoginPhone ?? 'Chưa cập nhật số điện thoại'))
        : 'Chưa đăng nhập';

    final String myReferralCode = isUserLoggedIn
        ? (_profile.memberCode.isNotEmpty
            ? _profile.memberCode
            : (AuthService.instance.currentUserId != null
                ? 'MLD-${AuthService.instance.currentUserId!.substring(0, 6).toUpperCase()}'
                : 'MLD-000001'))
        : 'MLD-KHACH';

    // Dữ liệu thực từ database / repository (không fallback mock)
    // Khi chưa đăng nhập / khách thì số liệu tài khoản về 0 triệt để!
    final upcomingAppointmentsCount = isUserLoggedIn
        ? BookingRepository.instance.getUpcomingAppointments().length
        : 0;
    final remainingSessions = isUserLoggedIn
        ? TreatmentRepository.instance.packages
            .where((p) => p.status == PackageStatus.active)
            .fold<int>(0, (acc, p) => acc + (p.totalSessions - p.completedSessions))
        : 0;
    final myCoursesCount = isUserLoggedIn
        ? AcademyRepository.instance.enrolledCourses
            .where((c) => AcademyRepository.instance.isCourseApproved(c.id, c.title))
            .length
        : 0;
    final vouchersCount = isUserLoggedIn
        ? MembershipRepository.instance.vouchers
            .where((v) => v.status == 'AVAILABLE')
            .length
        : 0;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: widget.onBackToHome != null
            ? IconButton(
                icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: AppColors.textPrimary),
                onPressed: widget.onBackToHome,
              )
            : null,
        title: Text(
          context.tr('Cá nhân', 'Profile'),
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ==========================================
              // 1. THẺ HỒ SƠ: KHÁCH HOẶC ĐÃ ĐĂNG NHẬP
              // ==========================================
              if (!AuthService.instance.isLoggedIn)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    // BỎ VIỀN, NỔI BẬT KHỐI BẰNG BÓNG MỜ MỎNG
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        decoration: const BoxDecoration(
                          color: AppColors.mintBackground,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.person_rounded, size: 30, color: AppColors.primary),
                      ),
                      const SizedBox(width: 14),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Khách trải nghiệm',
                              style: TextStyle(
                                fontSize: 16.5,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            SizedBox(height: 4),
                            Text(
                              'Đăng nhập để xem lịch & tích điểm',
                              style: TextStyle(
                                fontSize: 12.5,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      ElevatedButton(
                        onPressed: () async {
                          await Navigator.push(
                            context,
                            AppPageTransitions.modalSlideUp(page: const A03LoginScreen()),
                          );
                          _refreshProfile();
                          if (mounted) setState(() {});
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: const Text(
                          'Đăng nhập',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                )
              else
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    // BỎ VIỀN, NỔI BẬT KHỐI BẰNG BÓNG MỜ MỎNG
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      AppProfileAvatar(
                        avatarUrl: _profile.avatarUrl,
                        size: 60,
                        onEditTap: () => _requireLoginAndRun(() async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const F02EditProfileScreen()),
                          );
                          _refreshProfile();
                        }, title: 'Thông tin cá nhân', message: 'Vui lòng đăng nhập để cập nhật hồ sơ cá nhân.'),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              displayName,
                              style: const TextStyle(
                                fontSize: 16.5,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              displayPhone,
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.edit_outlined, size: 20, color: AppColors.primary),
                        onPressed: () => _requireLoginAndRun(() async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const F02EditProfileScreen()),
                          );
                          _refreshProfile();
                        }, title: 'Thông tin cá nhân', message: 'Vui lòng đăng nhập để cập nhật hồ sơ cá nhân.'),
                      ),
                    ],
                  ),
                ),

              const SizedBox(height: 16),

              // ==========================================
              // 2. CHỈ SỐ NHANH (Dữ liệu thực tế từ Database)
              // ==========================================
              Row(
                children: [
                  Expanded(
                    child: _buildMetricItem(
                      icon: Icons.calendar_today_outlined,
                      count: upcomingAppointmentsCount.toString(),
                      label: context.tr('Lịch hẹn', 'Appointments'),
                      subLabel: context.tr('sắp tới', 'upcoming'),
                      onTap: () => _requireLoginAndRun(() {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const C09MyAppointmentsScreen()),
                        );
                      }, title: 'Xem lịch hẹn', message: 'Vui lòng đăng nhập để xem danh sách lịch hẹn của bạn.'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildMetricItem(
                      icon: Icons.spa_outlined,
                      count: remainingSessions.toString(),
                      label: context.tr('Liệu trình', 'Packages'),
                      subLabel: context.tr('buổi còn lại', 'remaining'),
                      onTap: () => _requireLoginAndRun(() {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const D01MyPackagesScreen()),
                        );
                      }, title: 'Xem gói liệu trình', message: 'Vui lòng đăng nhập để xem thông tin liệu trình của bạn.'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildMetricItem(
                      icon: Icons.school_outlined,
                      count: myCoursesCount.toString(),
                      label: context.tr('Khóa học', 'Courses'),
                      subLabel: context.tr('đang học', 'active'),
                      onTap: () => _requireLoginAndRun(() {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const E07MyCoursesScreen()),
                        );
                      }, title: 'Xem khóa học', message: 'Vui lòng đăng nhập để theo dõi khóa học của bạn.'),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // ==========================================
              // 3. NHÓM 1: DỊCH VỤ TRỊ LIỆU (ĐƯA LÊN TRÊN)
              // ==========================================
              _buildSectionHeader(context.tr('DỊCH VỤ TRỊ LIỆU', 'THERAPY SERVICES')),
              const SizedBox(height: 8),
              _buildCardContainer([
                _buildMenuItem(
                  icon: Icons.calendar_today_outlined,
                  title: context.tr('Lịch hẹn của tôi', 'My Appointments'),
                  onTap: () => _requireLoginAndRun(() {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const C09MyAppointmentsScreen()),
                    );
                  }, title: 'Lịch hẹn của tôi', message: 'Vui lòng đăng nhập để xem danh sách lịch hẹn của bạn.'),
                ),
                const Divider(height: 1, indent: 56, color: AppColors.border),
                _buildMenuItem(
                  icon: Icons.spa_outlined,
                  title: context.tr('Gói liệu trình', 'Treatment Packages'),
                  onTap: () => _requireLoginAndRun(() {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const D01MyPackagesScreen()),
                    );
                  }, title: 'Gói liệu trình', message: 'Vui lòng đăng nhập để theo dõi gói liệu trình của bạn.'),
                ),
                const Divider(height: 1, indent: 56, color: AppColors.border),
                _buildMenuItem(
                  icon: Icons.menu_book_outlined,
                  title: context.tr('Nhật ký trị liệu', 'Care Journal'),
                  onTap: () => _requireLoginAndRun(() {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const D03CareJournalScreen()),
                    );
                  }, title: 'Nhật ký trị liệu', message: 'Vui lòng đăng nhập để xem hồ sơ và nhật ký trị liệu của bạn.'),
                ),
              ]),

              const SizedBox(height: 20),

              // ==========================================
              // 4. NHÓM 2: ƯU ĐÃI (VOUCHER & GIỚI THIỆU)
              // ==========================================
              _buildSectionHeader(context.tr('ƯU ĐÃI', 'OFFERS & PROMOTIONS')),
              const SizedBox(height: 8),
              _buildCardContainer([
                // 1. Ví Voucher & Ưu đãi (Màu xanh lá MLD đặc trưng #007A48)
                _buildMenuItem(
                  icon: Icons.confirmation_number_rounded,
                  iconColor: const Color(0xFF007A48),
                  title: context.tr('Ví Voucher & Ưu đãi', 'My Vouchers & Offers'),
                  subtitle: vouchersCount > 0
                      ? context.tr('$vouchersCount mã ưu đãi khả dụng', '$vouchersCount active vouchers')
                      : context.tr('Mã giảm giá & quà tặng tri ân', 'Discount codes and reward gifts'),
                  trailing: vouchersCount > 0
                      ? Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE8F5E9),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFF007A48)),
                          ),
                          child: Text(
                            '$vouchersCount voucher',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF007A48),
                            ),
                          ),
                        )
                      : null,
                  onTap: () => _requireLoginAndRun(() {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const F05MyVouchersScreen()),
                    );
                  }, title: 'Ví Voucher của tôi', message: 'Vui lòng đăng nhập để xem danh sách voucher và mã ưu đãi.'),
                ),
                const Divider(height: 1, indent: 56, color: AppColors.border),

                // 2. Mã giới thiệu của tôi (Hiện đầy đủ mã GT, có nút Copy)
                _buildMenuItem(
                  icon: Icons.qr_code_2_rounded,
                  iconColor: AppColors.secondary,
                  title: context.tr('Mã giới thiệu của tôi', 'My Referral Code'),
                  subtitleWidget: Text(
                    myReferralCode,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textHeading,
                      letterSpacing: 0.5,
                    ),
                  ),
                  showChevron: false,
                  trailing: InkWell(
                    onTap: () {
                      Clipboard.setData(ClipboardData(text: myReferralCode));
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Đã sao chép mã giới thiệu: $myReferralCode'),
                          duration: const Duration(seconds: 2),
                          backgroundColor: AppColors.primary,
                        ),
                      );
                    },
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.secondary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.copy_rounded, size: 14, color: AppColors.secondary),
                          SizedBox(width: 4),
                          Text(
                            'Sao chép',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: AppColors.secondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: myReferralCode));
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Đã sao chép mã giới thiệu: $myReferralCode'),
                        duration: const Duration(seconds: 2),
                        backgroundColor: AppColors.primary,
                      ),
                    );
                  },
                ),
                const Divider(height: 1, indent: 56, color: AppColors.border),

                // 3. Người giới thiệu (Đồng bộ, hiện tên người GT, có nút Nhập mã / Đổi mã)
                _buildMenuItem(
                  icon: Icons.handshake_outlined,
                  iconColor: AppColors.primary,
                  title: context.tr('Người giới thiệu', 'Referred By'),
                  subtitle: (_profile.referrerName != null && _profile.referrerName!.trim().isNotEmpty)
                      ? _profile.referrerName!
                      : context.tr('Chưa có (Chạm để nhập mã)', 'None (Tap to enter code)'),
                  showChevron: false,
                  trailing: InkWell(
                    onTap: () => _requireLoginAndRun(
                      _showEnterReferralCodeDialog,
                      title: 'Người giới thiệu',
                      message: 'Vui lòng đăng nhập để nhập mã người giới thiệu.',
                    ),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: (_profile.referrerName != null && _profile.referrerName!.trim().isNotEmpty)
                            ? AppColors.iceBlue
                            : const Color(0xFFE8F5E9),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: (_profile.referrerName != null && _profile.referrerName!.trim().isNotEmpty)
                              ? AppColors.border
                              : const Color(0xFF208C58).withValues(alpha: 0.4),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            (_profile.referrerName != null && _profile.referrerName!.trim().isNotEmpty)
                                ? Icons.swap_horiz_rounded
                                : Icons.edit_note_rounded,
                            size: 14,
                            color: (_profile.referrerName != null && _profile.referrerName!.trim().isNotEmpty)
                                ? AppColors.primary
                                : const Color(0xFF007A48),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            (_profile.referrerName != null && _profile.referrerName!.trim().isNotEmpty)
                                ? 'Đổi mã'
                                : 'Nhập mã',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: (_profile.referrerName != null && _profile.referrerName!.trim().isNotEmpty)
                                  ? AppColors.primary
                                  : const Color(0xFF007A48),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  onTap: () => _requireLoginAndRun(
                    _showEnterReferralCodeDialog,
                    title: 'Người giới thiệu',
                    message: 'Vui lòng đăng nhập để nhập mã người giới thiệu.',
                  ),
                ),
              ]),

              const SizedBox(height: 20),

              // ==========================================
              // 4. NHÓM 2: ĐÀO TẠO & KHÓA HỌC
              // ==========================================
              _buildSectionHeader(context.tr('ĐÀO TẠO & KHÓA HỌC', 'ACADEMY & COURSES')),
              const SizedBox(height: 8),
              _buildCardContainer([
                _buildMenuItem(
                  icon: Icons.school_outlined,
                  title: context.tr('Khóa học của tôi', 'My Courses'),
                  onTap: () => _requireLoginAndRun(() {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const E07MyCoursesScreen()),
                    );
                  }, title: 'Khóa học của tôi', message: 'Vui lòng đăng nhập để theo dõi các khóa học bạn đã đăng ký.'),
                ),
                const Divider(height: 1, indent: 56, color: AppColors.border),
                _buildMenuItem(
                  icon: Icons.event_note_outlined,
                  title: context.tr('Lịch học', 'Class Schedule'),
                  onTap: () => _requireLoginAndRun(() {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const E11AttendanceScheduleScreen()),
                    );
                  }, title: 'Lịch học', message: 'Vui lòng đăng nhập để theo dõi thời khóa biểu học viên.'),
                ),
                const Divider(height: 1, indent: 56, color: AppColors.border),
                _buildMenuItem(
                  icon: Icons.workspace_premium_outlined,
                  title: context.tr('Chứng nhận', 'Certifications'),
                  onTap: () => _requireLoginAndRun(() {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const E12LearningResultsScreen()),
                    );
                  }, title: 'Chứng nhận', message: 'Vui lòng đăng nhập để xem chứng chỉ và chứng nhận hoàn thành khóa học.'),
                ),
              ]),

              const SizedBox(height: 20),

              // ==========================================
              // 5. NHÓM 3: TÀI KHOẢN & HỆ THỐNG
              // ==========================================
              _buildSectionHeader(context.tr('TÀI KHOẢN & HỆ THỐNG', 'ACCOUNT & SETTINGS')),
              const SizedBox(height: 8),
              _buildCardContainer([
                _buildMenuItem(
                  icon: Icons.settings_outlined,
                  title: context.tr('Cài đặt tài khoản', 'Account Settings'),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const F08SettingsScreen()),
                    );
                  },
                ),
                const Divider(height: 1, indent: 56, color: AppColors.border),
                if (!AuthService.instance.isLoggedIn)
                  _buildMenuItem(
                    icon: Icons.login_rounded,
                    iconColor: AppColors.primary,
                    title: context.tr('Đăng nhập / Đăng ký', 'Sign In / Register'),
                    titleColor: AppColors.primary,
                    onTap: () async {
                      await Navigator.push(
                        context,
                        AppPageTransitions.modalSlideUp(page: const A03LoginScreen()),
                      );
                      _refreshProfile();
                      if (mounted) setState(() {});
                    },
                    showChevron: true,
                  )
                else
                  _buildMenuItem(
                    icon: Icons.logout_rounded,
                    iconColor: AppColors.error,
                    title: context.tr('Đăng xuất', 'Sign Out'),
                    titleColor: AppColors.error,
                    onTap: _handleLogout,
                    showChevron: false,
                  ),
              ]),

              const SizedBox(height: 28),

              // ==========================================
              // 6. THÔNG TIN PHIÊN BẢN & HOTLINE
              // ==========================================
              Center(
                child: Column(
                  children: [
                    Text(
                      'MLD Việt Nam',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Phiên bản 1.0.0 · Hotline: ${PortalSettingsService.instance.hotlineSupport}',
                      style: TextStyle(
                        fontSize: 11.5,
                        color: AppColors.textPlaceholder,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w700,
        color: AppColors.textSecondary,
        letterSpacing: 0.5,
      ),
    );
  }

  Widget _buildMetricItem({
    required IconData icon,
    required String count,
    required String label,
    required String subLabel,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          // BỎ VIỀN, NỔI BẬT KHỐI BẰNG BÓNG MỜ MỎNG
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 22, color: AppColors.primary),
            const SizedBox(height: 8),
            Text(
              count,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            Text(
              subLabel,
              style: const TextStyle(
                fontSize: 11,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCardContainer(List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        // BỎ VIỀN, NỔI BẬT KHỐI BẰNG BÓNG MỜ MỎNG
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        children: children,
      ),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    Color? iconColor,
    required String title,
    String? subtitle,
    Widget? subtitleWidget,
    Color? titleColor,
    required VoidCallback onTap,
    bool showChevron = true,
    Widget? trailing,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
      leading: Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: (iconColor ?? AppColors.primary).withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(
          icon,
          size: 20,
          color: iconColor ?? AppColors.primary,
        ),
      ),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 14.5,
          fontWeight: FontWeight.w600,
          color: titleColor ?? AppColors.textPrimary,
        ),
      ),
      subtitle: subtitleWidget ?? (subtitle != null && subtitle.isNotEmpty
          ? Text(
              subtitle,
              style: const TextStyle(
                fontSize: 12.5,
                color: AppColors.textSecondary,
              ),
            )
          : null),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (trailing != null) trailing,
          if (showChevron) ...[
            const SizedBox(width: 4),
            const Icon(
              Icons.chevron_right_rounded,
              size: 20,
              color: AppColors.textPlaceholder,
            ),
          ],
        ],
      ),
      onTap: onTap,
    );
  }

  void _showEnterReferralCodeDialog() {
    final ctrl = TextEditingController();
    final bool hasExistingReferrer = _profile.referrerName != null && _profile.referrerName!.trim().isNotEmpty;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          hasExistingReferrer ? 'Đổi mã người giới thiệu' : 'Nhập mã người giới thiệu',
          style: const TextStyle(fontSize: 16.5, fontWeight: FontWeight.bold, color: AppColors.textHeading),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Nhập mã của Bác sĩ hoặc Kỹ thuật viên đã giới thiệu bạn:', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
            const SizedBox(height: 12),
            TextField(
              controller: ctrl,
              textCapitalization: TextCapitalization.characters,
              decoration: InputDecoration(
                hintText: 'Ví dụ: REF_TRUONG_MLD_01',
                filled: true,
                fillColor: AppColors.surfaceDisabled,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.border)),
              ),
            ),
          ],
        ),
        actions: [
          if (hasExistingReferrer)
            TextButton(
              onPressed: () async {
                Navigator.pop(ctx);
                await MembershipRepository.instance.clearReferral();
                if (mounted) {
                  setState(() {
                    _profile = MembershipRepository.instance.profile;
                  });
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Đã gỡ người giới thiệu (cho về 0)!'),
                      backgroundColor: AppColors.primary,
                    ),
                  );
                }
              },
              child: const Text('Gỡ mã (về 0)', style: TextStyle(color: Colors.red)),
            ),
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Hủy', style: TextStyle(color: AppColors.textSecondary)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () async {
              final code = ctrl.text.trim();
              if (code.isNotEmpty) {
                Navigator.pop(ctx);
                final res = await MembershipRepository.instance.linkReferralCode(code);
                if (mounted) {
                  setState(() {
                    _profile = MembershipRepository.instance.profile;
                  });
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(res['message'] as String),
                      backgroundColor: (res['success'] == true) ? AppColors.accent : Colors.red,
                    ),
                  );
                }
              }
            },
            child: const Text('Xác nhận'),
          ),
        ],
      ),
    );
  }
}