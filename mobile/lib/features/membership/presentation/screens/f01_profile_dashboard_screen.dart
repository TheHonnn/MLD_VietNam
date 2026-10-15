import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/widgets/profile_image_picker.dart';
import '../../data/models/membership_models.dart';
import '../../data/repositories/mock_membership_repository.dart';
import '../../../booking/presentation/screens/c09_my_appointments_screen.dart';
import '../../../treatment/presentation/screens/d01_my_packages_screen.dart';
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
  final MockMembershipRepository _repo = MockMembershipRepository();
  late UserProfile _profile;

  @override
  void initState() {
    super.initState();
    _profile = _repo.profile;
  }

  void _refreshProfile() {
    setState(() {
      _profile = _repo.profile;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background, // #F8F1E8
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // --- 1. TIÊU ĐỀ TRANG ---
              const Text(
                'Tài khoản của tôi',
                style: TextStyle(
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
                          _profile.fullName,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary, // #40352F
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${_profile.phone} · Đã xác thực',
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
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const D08NotificationsScreen()),
                      );
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
                          Positioned(
                            top: 10,
                            right: 11,
                            child: Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: Color(0xFF985018),
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
                  borderRadius: BorderRadius.circular(20),
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    stops: [0.0, 0.55, 1.0],
                    colors: [
                      Color(0xFF7E4213),
                      Color(0xFF985018),
                      Color(0xFF693B20),
                    ],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF693B20).withValues(alpha: 0.25),
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
                            color: Color(0xFFC58D59), // #C58D59
                          ),
                        ),
                        const Icon(
                          Icons.workspace_premium_rounded,
                          size: 24,
                          color: Color(0xFFC58D59),
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
                      'Mã hội viên · ${_profile.memberCode}',
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
                            color: const Color(0xFFC58D59),
                            width: 1.0,
                          ),
                          color: Colors.black.withValues(alpha: 0.12),
                        ),
                        child: const Row(
                          children: [
                            Icon(
                              Icons.qr_code_2_rounded,
                              size: 20,
                              color: Color(0xFFC58D59),
                            ),
                            SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Xem thẻ hội viên',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                            Icon(
                              Icons.arrow_forward_rounded,
                              size: 16,
                              color: Colors.white,
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 10),

                    // Subtext Dữ liệu minh họa
                    Align(
                      alignment: Alignment.centerRight,
                      child: Text(
                        'Dữ liệu minh họa',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w400,
                          color: Colors.white.withValues(alpha: 0.75),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // --- 4. TỔNG QUAN TÀI KHOẢN (3 CHỈ SỐ: Lịch hẹn, Liệu trình, Khóa học) ---
              Row(
                children: [
                  Expanded(
                    child: _buildMetricCard(
                      icon: Icons.calendar_today_rounded,
                      value: '2',
                      label: 'Lịch hẹn',
                      subLabel: 'sắp tới',
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
                      value: '11',
                      label: 'Liệu trình',
                      subLabel: 'buổi còn lại',
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
                      value: '1',
                      label: 'Khóa học',
                      subLabel: 'đang học',
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const E07MyCoursesScreen()),
                        );
                      },
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // --- 5. NHÓM 1: DỊCH VỤ CỦA TÔI ---
              _buildSectionTitle('Dịch vụ của tôi'),
              _buildCardGroup([
                _buildMenuItem(
                  icon: Icons.calendar_month_outlined,
                  title: 'Lịch hẹn của tôi',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const C09MyAppointmentsScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  icon: Icons.spa_outlined,
                  title: 'Gói liệu trình',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const D01MyPackagesScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  icon: Icons.menu_book_outlined,
                  title: 'Nhật ký trị liệu',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const D03CareJournalScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  icon: Icons.assignment_outlined,
                  title: 'Phiếu thông tin trước dịch vụ',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const D04PreServiceConsultationScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  icon: Icons.menu_book_rounded,
                  title: 'Hướng dẫn chăm sóc tại nhà',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const D06HomeCareGuidelinesScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  icon: Icons.headset_mic_outlined,
                  title: 'Tư vấn & hỗ trợ',
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
              _buildSectionTitle('Hội viên & ưu đãi'),
              _buildCardGroup([
                _buildMenuItem(
                  icon: Icons.credit_card_outlined,
                  title: 'Thẻ hội viên',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const F03MembershipCardScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  icon: Icons.auto_awesome_outlined,
                  title: 'Điểm tích lũy',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const F04LoyaltyPointsScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  icon: Icons.confirmation_number_outlined,
                  title: 'Ưu đãi của tôi',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const F05MyVouchersScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  icon: Icons.people_outline_rounded,
                  title: 'Giới thiệu bạn bè',
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
              _buildSectionTitle('Học viện'),
              _buildCardGroup([
                _buildMenuItem(
                  icon: Icons.school_outlined,
                  title: 'Khóa học của tôi',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const E07MyCoursesScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  icon: Icons.event_note_outlined,
                  title: 'Lịch học',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const E11AttendanceScheduleScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  icon: Icons.workspace_premium_outlined,
                  title: 'Chứng chỉ & điểm',
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
              _buildSectionTitle('Tài khoản'),
              _buildCardGroup([
                _buildMenuItem(
                  icon: Icons.receipt_long_outlined,
                  title: 'Lịch sử thanh toán',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const F06PaymentHistoryScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  icon: Icons.person_outline_rounded,
                  title: 'Thông tin cá nhân',
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
                  title: 'Cài đặt tài khoản',
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

              // --- 10. THẺ THÔNG TIN TỔNG QUAN (350x234, r=20, #F3E2CE) ---
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppColors.surfaceSecondary, // #F3E2CE
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.border, width: 1.0),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Một tài khoản, nhiều trải nghiệm',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Buổi liệu trình tiếp theo: 15/10/2026 · 09:00. 2 gói dịch vụ đang hoạt động.',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w400,
                        height: 1.45,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    SizedBox(height: 6),
                    Text(
                      '3 khóa đã ghi danh · 1 đang học · 1 hoàn thành · 1 bảo lưu.',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w400,
                        height: 1.45,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Chi nhánh mẫu 01 — Quận 3 (ưu tiên)',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // --- 11. NHÃN MINH HỌA ---
              const Center(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.info_outline_rounded,
                      size: 14,
                      color: AppColors.textSecondary,
                    ),
                    SizedBox(width: 6),
                    Text(
                      'Dữ liệu minh họa',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),
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
            color: Color(0xFFF3E2CE),
          ),
      ],
    );
  }
}
