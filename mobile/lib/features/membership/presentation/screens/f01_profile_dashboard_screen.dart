import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
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
import 'f02_edit_profile_screen.dart';
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
    MembershipRepository.instance.fetchProfile().then((p) {
      if (mounted) {
        setState(() {
          _profile = p;
        });
      }
    });
    BookingRepository.instance.fetchMyAppointments().then((_) {
      if (mounted) setState(() {});
    });
    TreatmentRepository.instance.fetchPackages().then((_) {
      if (mounted) setState(() {});
    });
    AcademyRepository.instance.getMyCourses().then((_) {
      if (mounted) setState(() {});
    });
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
              await AuthService.instance.logout();
              if (mounted) {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const MainLayoutScreen(initialIndex: 0)),
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
    final displayName = (_profile.fullName.trim().isNotEmpty && _profile.fullName != "Khách hàng MLD")
        ? _profile.fullName
        : ((AuthService.instance.currentDisplayName?.trim().isNotEmpty ?? false)
            ? AuthService.instance.currentDisplayName!
            : "Khách hàng MLD");

    final displayPhone = _profile.phone.trim().isNotEmpty
        ? _profile.phone
        : (AuthService.instance.lastLoginPhone ?? 'Chưa cập nhật số điện thoại');

    // Dữ liệu thực từ database / repository (không fallback mock)
    final upcomingAppointmentsCount = BookingRepository.instance.getUpcomingAppointments().length;
    final remainingSessions = TreatmentRepository.instance.packages
        .where((p) => p.status == PackageStatus.active)
        .fold<int>(0, (acc, p) => acc + (p.totalSessions - p.completedSessions));
    final myCoursesCount = AcademyRepository.instance.enrolledCourses
        .where((c) => AcademyRepository.instance.isCourseApproved(c.id, c.title))
        .length;

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
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: AppColors.mintBackground,
                          shape: BoxShape.circle,
                          border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
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
                            MaterialPageRoute(builder: (_) => const A03LoginScreen()),
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
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      AppProfileAvatar(
                        avatarUrl: _profile.avatarUrl,
                        size: 60,
                        onEditTap: () async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const F02EditProfileScreen()),
                          );
                          _refreshProfile();
                        },
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
                        onPressed: () async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const F02EditProfileScreen()),
                          );
                          _refreshProfile();
                        },
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

              const SizedBox(height: 24),

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
                  icon: Icons.person_outline_rounded,
                  title: context.tr('Thông tin cá nhân', 'Personal Information'),
                  onTap: () => _requireLoginAndRun(() async {
                    await Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const F02EditProfileScreen()),
                    );
                    _refreshProfile();
                  }, title: 'Thông tin cá nhân', message: 'Vui lòng đăng nhập để xem và cập nhật hồ sơ cá nhân của bạn.'),
                ),
                const Divider(height: 1, indent: 56, color: AppColors.border),
                _buildMenuItem(
                  icon: Icons.settings_outlined,
                  title: context.tr('Cài đặt tài khoản', 'Account Settings'),
                  onTap: () => _requireLoginAndRun(() {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const F08SettingsScreen()),
                    );
                  }, title: 'Cài đặt tài khoản', message: 'Vui lòng đăng nhập để quản lý cài đặt tài khoản và bảo mật.'),
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
                        MaterialPageRoute(builder: (_) => const A03LoginScreen()),
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
              const Center(
                child: Column(
                  children: [
                    Text(
                      'MLD Việt Nam · Chuẩn Y khoa Vodder Quốc tế',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Phiên bản 1.0.0 · Hotline: 096.7786.399',
                      style: TextStyle(
                        fontSize: 11.5,
                        color: Color(0xFF94A3B8),
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
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 6,
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
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
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
    Color? titleColor,
    required VoidCallback onTap,
    bool showChevron = true,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
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
      trailing: showChevron
          ? const Icon(
              Icons.chevron_right_rounded,
              size: 20,
              color: Color(0xFF94A3B8),
            )
          : null,
      onTap: onTap,
    );
  }
}