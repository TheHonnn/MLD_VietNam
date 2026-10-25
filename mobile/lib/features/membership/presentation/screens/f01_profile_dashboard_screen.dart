import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/widgets/profile_image_picker.dart';
import '../../data/models/membership_models.dart';
import '../../data/repositories/membership_repository.dart';

import '../../../booking/presentation/screens/c09_my_appointments_screen.dart';
import '../../../booking/data/repositories/booking_repository.dart';
import '../../../treatment/presentation/screens/d01_my_packages_screen.dart';
import '../../../treatment/data/repositories/treatment_repository.dart';
import '../../../treatment/data/models/treatment_models.dart';
import '../../../treatment/presentation/screens/d03_care_journal_screen.dart';
import '../../../treatment/presentation/screens/d04_pre_service_consultation_screen.dart';
import '../../../treatment/presentation/screens/d06_home_care_guidelines_screen.dart';
import '../../../treatment/presentation/screens/d07_customer_support_screen.dart';
import '../../../treatment/presentation/screens/d08_notifications_screen.dart';
import 'f02_edit_profile_screen.dart';
import 'f03_membership_card_screen.dart';
import 'f04_loyalty_points_screen.dart';
import 'f05_my_vouchers_screen.dart';
import 'f06_payment_history_screen.dart';
import 'f07_referral_program_screen.dart';
import 'f08_settings_screen.dart';
import '../../../academy/presentation/screens/e07_my_courses_screen.dart';
import '../../../academy/presentation/screens/e11_attendance_schedule_screen.dart';
import '../../../academy/presentation/screens/e12_learning_results_screen.dart';

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
  }

  void _refreshProfile() {
    setState(() {
      _profile = _repo.profile;
    });
  }

  @override
  Widget build(BuildContext context) {
    final bool isEn = _repo.settings.language == 'English' || Localizations.localeOf(context).languageCode == 'en';
    final String cleanMemberCode = _profile.memberCode.isNotEmpty && _profile.memberCode != 'MLD-000001'
        ? _profile.memberCode
        : (_profile.phone.isNotEmpty
            ? 'MLD-${_profile.phone.replaceAll(RegExp(r'\D'), '').padLeft(6, '0').substring(_profile.phone.replaceAll(RegExp(r'\D'), '').length > 6 ? _profile.phone.replaceAll(RegExp(r'\D'), '').length - 6 : 0)}'
            : 'MLD-MEMBER');
    return Scaffold(
      backgroundColor: AppColors.background, // #F8F1E8
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // --- 1. TIÊU ĐỀ TRANG ---
              Text(
                isEn ? 'My Account' : 'Tài khoản của tôi',
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w600,
                  height: 36.4 / 28,
                  color: AppColors.textHeading, // #693B20
                ),
              ),

              const SizedBox(height: 20),

              // --- 2. PROFILE HEADER (ProfileHeader / 01) ---
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Avatar tròn 64x64 r=32
                  AppProfileAvatar(
                    avatarUrl: _profile.avatarUrl,
                    size: 64,
                    onEditTap: () async {
                      await Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const F02EditProfileScreen()),
                      );
                      _refreshProfile();
                    },
                  ),

                  const SizedBox(width: 14),

                  // Tên, số điện thoại, hạng hội viên
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          (_profile.fullName.trim().isNotEmpty && _profile.fullName != "Khách hàng MLD")
                              ? _profile.fullName
                              : ((AuthService.instance.currentDisplayName?.trim().isNotEmpty ?? false)
                                  ? AuthService.instance.currentDisplayName!
                                  : "Khách hàng"),
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary, // #40352F
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _profile.phone.trim().isNotEmpty ? '${_profile.phone} · Đã xác thực' : 'Chưa cập nhật SĐT',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w400,
                            color: AppColors.textSecondary, // #6B6158
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _profile.memberTier,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary, // #985018
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Nút Thông báo (D08)
                  InkWell(
                    onTap: () async {
                      await Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const D08NotificationsScreen()),
                      );
                      if (mounted) setState(() {});
                    },
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.border, width: 1.0),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          const Icon(
                            Icons.notifications_none_rounded,
                            size: 22,
                            color: AppColors.primary,
                          ),
                          if (TreatmentRepository.instance.hasUnreadNotifications)
                            Positioned(
                              top: 10,
                              right: 11,
                              child: Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: Color(0xFFD64545),
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(width: 8),

                  // Nút Chỉnh sửa hồ sơ (44x44, r=14, white, icon pencil)
                  InkWell(
                    onTap: () async {
                      await Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const F02EditProfileScreen()),
                      );
                      _refreshProfile();
                    },
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.border, width: 1.0),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.edit_outlined,
                          size: 20,
                          color: AppColors.primary, // #985018
                        ),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // --- 3. MEMBERSHIP SUMMARY CARD (350x236, r=20, LinearGradient) ---
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    stops: [0.0, 0.55, 1.0],
                    colors: [
                      Color(0xFF7E4213),
                      Color(0xFF168477),
                      Color(0xFF1F2937),
                    ],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF1F2937).withValues(alpha: 0.25),
                      blurRadius: 14,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Hạng hội viên & vương miện
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          _profile.memberTier,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF145B55), // #C58D59
                          ),
                        ),
                        const Icon(
                          Icons.workspace_premium_rounded,
                          size: 24,
                          color: Color(0xFF145B55),
                        ),
                      ],
                    ),

                    const SizedBox(height: 12),

                    // Điểm hội viên
                    Text(
                      '${_profile.points.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]}.')} điểm',
                      style: const TextStyle(
                        fontSize: 30,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${isEn ? "Member Code" : "Mã hội viên"} · $cleanMemberCode',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                        color: Colors.white.withValues(alpha: 0.9),
                      ),
                    ),

                    const SizedBox(height: 18),

                    // Nút Xem thẻ hội viên (border #C58D59, r=12)
                    InkWell(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const F03MembershipCardScreen()),
                        );
                      },
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        height: 44,
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: const Color(0xFF145B55),
                            width: 1.0,
                          ),
                          color: Colors.black.withValues(alpha: 0.12),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.qr_code_2_rounded,
                              size: 20,
                              color: Color(0xFF145B55),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                isEn ? 'View Membership Card' : 'Xem thẻ hội viên',
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                            const Icon(
                              Icons.arrow_forward_rounded,
                              size: 16,
                              color: Colors.white,
                            ),
                          ],
                        ),
                      ),
                    ),

                  ],
                ),
              ),

              const SizedBox(height: 16),

              // --- 4. TỔNG QUAN TÀI KHOẢN (3 CHỈ SỐ: Lịch hẹn, Liệu trình, Khóa học) ---
              Builder(
                builder: (context) {
                  final upcomingCount = BookingRepository.instance.getUpcomingAppointments().length;
                  final remainingSessions = TreatmentRepository.instance
                      .packages
                      .where((p) => p.status == PackageStatus.active)
                      .fold<int>(0, (acc, p) => acc + (p.totalSessions - p.completedSessions));

                  return Row(
                    children: [
                      Expanded(
                        child: _buildMetricCard(
                          icon: Icons.calendar_today_rounded,
                          value: upcomingCount.toString(),
                          label: isEn ? 'Bookings' : 'Lịch hẹn',
                          subLabel: isEn ? 'upcoming' : 'sắp tới',
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const C09MyAppointmentsScreen()),
                            );
                          },
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _buildMetricCard(
                          icon: Icons.spa_outlined,
                          value: remainingSessions.toString(),
                          label: isEn ? 'Treatments' : 'Liệu trình',
                          subLabel: isEn ? 'remaining' : 'buổi còn lại',
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const D01MyPackagesScreen()),
                            );
                          },
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _buildMetricCard(
                          icon: Icons.school_outlined,
                          value: '0',
                          label: isEn ? 'Courses' : 'Khóa học',
                          subLabel: isEn ? 'learning' : 'đang học',
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const E07MyCoursesScreen()),
                            );
                          },
                        ),
                      ),
                    ],
                  );
                },
              ),

              const SizedBox(height: 24),

              // --- 5. NHÓM 1: DỊCH VỤ CỦA TÔI ---
              _buildSectionTitle(isEn ? 'My Services' : 'Dịch vụ của tôi'),
              _buildCardGroup([
                _buildMenuItem(
                  icon: Icons.calendar_month_outlined,
                  title: isEn ? 'My Appointments' : 'Lịch hẹn của tôi',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const C09MyAppointmentsScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  icon: Icons.spa_outlined,
                  title: isEn ? 'My Packages' : 'Gói liệu trình',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const D01MyPackagesScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  icon: Icons.menu_book_outlined,
                  title: isEn ? 'Care Journal' : 'Nhật ký trị liệu',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const D03CareJournalScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  icon: Icons.assignment_outlined,
                  title: isEn ? 'Pre-service Questionnaire' : 'Phiếu thông tin trước dịch vụ',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const D04PreServiceConsultationScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  icon: Icons.menu_book_rounded,
                  title: isEn ? 'Home Care Guidelines' : 'Hướng dẫn chăm sóc tại nhà',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const D06HomeCareGuidelinesScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  icon: Icons.headset_mic_outlined,
                  title: isEn ? 'Support & Inquiries' : 'Tư vấn & hỗ trợ',
                  isLast: true,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const D07CustomerSupportScreen()),
                    );
                  },
                ),
              ]),

              const SizedBox(height: 20),

              // --- 7. NHÓM 2: HỘI VIÊN & ƯU ĐÃI ---
              _buildSectionTitle(isEn ? 'Membership & Offers' : 'Hội viên & ưu đãi'),
              _buildCardGroup([
                _buildMenuItem(
                  icon: Icons.credit_card_outlined,
                  title: isEn ? 'Membership Card' : 'Thẻ hội viên',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const F03MembershipCardScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  icon: Icons.auto_awesome_outlined,
                  title: isEn ? 'Reward Points' : 'Điểm tích lũy',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const F04LoyaltyPointsScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  icon: Icons.confirmation_number_outlined,
                  title: isEn ? 'My Vouchers' : 'Ưu đãi của tôi',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const F05MyVouchersScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  icon: Icons.people_outline_rounded,
                  title: isEn ? 'Refer Friends' : 'Giới thiệu bạn bè',
                  isLast: true,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const F07ReferralProgramScreen()),
                    );
                  },
                ),
              ]),

              const SizedBox(height: 20),

              // --- 8. NHÓM 3: HỌC VIỆN ---
              _buildSectionTitle(isEn ? 'Academy' : 'Học viện'),
              _buildCardGroup([
                _buildMenuItem(
                  icon: Icons.school_outlined,
                  title: isEn ? 'My Courses' : 'Khóa học của tôi',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const E07MyCoursesScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  icon: Icons.event_note_outlined,
                  title: isEn ? 'Schedule' : 'Lịch học',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const E11AttendanceScheduleScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  icon: Icons.workspace_premium_outlined,
                  title: isEn ? 'Certificates & Grades' : 'Giấy chứng nhận & điểm',
                  isLast: true,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const E12LearningResultsScreen()),
                    );
                  },
                ),
              ]),

              const SizedBox(height: 20),

              // --- 9. NHÓM 4: TÀI KHOẢN ---
              _buildSectionTitle(isEn ? 'Account' : 'Tài khoản'),
              _buildCardGroup([
                _buildMenuItem(
                  icon: Icons.receipt_long_outlined,
                  title: isEn ? 'Payment History' : 'Lịch sử thanh toán',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const F06PaymentHistoryScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  icon: Icons.person_outline_rounded,
                  title: isEn ? 'Personal Profile' : 'Thông tin cá nhân',
                  onTap: () async {
                    await Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const F02EditProfileScreen()),
                    );
                    _refreshProfile();
                  },
                ),
                _buildMenuItem(
                  icon: Icons.settings_outlined,
                  title: isEn ? 'Account Settings' : 'Cài đặt tài khoản',
                  isLast: true,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const F08SettingsScreen()),
                    );
                  },
                ),
              ]),



              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10.0),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: AppColors.textHeading, // #693B20
        ),
      ),
    );
  }

  Widget _buildMetricCard({
    required IconData icon,
    required String value,
    required String label,
    required String subLabel,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        height: 122,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.surface, // #FFFFFF
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border, width: 1.0),
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
            Icon(icon, size: 20, color: AppColors.primary),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary, // #985018
                  ),
                ),
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textPrimary, // #40352F
                  ),
                ),
                Text(
                  subLabel,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textSecondary, // #6B6158
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCardGroup(List<Widget> items) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface, // #FFFFFF
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border, width: 1.0),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: items,
      ),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    bool isLast = false,
  }) {
    return Column(
      children: [
        ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
          leading: Icon(icon, size: 22, color: AppColors.primary),
          title: Text(
            title,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w500,
              color: AppColors.textPrimary,
            ),
          ),
          trailing: const Icon(
            Icons.chevron_right_rounded,
            size: 20,
            color: AppColors.textSecondary,
          ),
          onTap: onTap,
        ),
        if (!isLast)
          const Divider(
            height: 1,
            thickness: 1,
            indent: 16,
            endIndent: 16,
            color: Color(0xFFE8F5F1),
          ),
      ],
    );
  }
}
