import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/widgets/profile_image_picker.dart';
import '../../../auth/presentation/screens/a03_login_screen.dart';
import '../../../booking/presentation/screens/c09_my_appointments_screen.dart';
import '../../data/models/membership_models.dart';
import '../../data/repositories/membership_repository.dart';
import 'f02_edit_profile_screen.dart';
import 'f08_settings_screen.dart';

/// Screen F01: Trang Cá nhân tối giản theo chuẩn Design System (#2860EB)
/// Loại bỏ toàn bộ các mục dư thừa: Hội viên, phiếu trước dịch vụ, hướng dẫn chăm sóc, v.v.
/// Chỉ giữ lại: Thông tin cá nhân, Lịch hẹn của tôi, Cài đặt tài khoản và Đăng xuất.
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

  void _handleLogout() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'Đăng xuất',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
        ),
        content: const Text(
          'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản hiện tại không?',
          style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Hủy', style: TextStyle(color: AppColors.textSecondary)),
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
                  MaterialPageRoute(builder: (_) => const A03LoginScreen()),
                  (route) => false,
                );
              }
            },
            child: const Text('Đăng xuất'),
          ),
        ],
      ),
    );
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

    return Scaffold(
      backgroundColor: Colors.white,
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
        title: const Text(
          'Cá nhân',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ==========================================
              // 1. THẺ HỒ SƠ NGƯỜI DÙNG (Minimalist Profile Header)
              // ==========================================
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
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

              const SizedBox(height: 24),

              // ==========================================
              // 2. DANH SÁCH MENU TỐI GIẢN (4 Mục duy nhất)
              // ==========================================
              const Text(
                'Tài khoản & Dịch vụ',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 10),

              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
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
                  children: [
                    // Mục 1: Thông tin cá nhân
                    _buildMenuItem(
                      icon: Icons.person_outline_rounded,
                      title: 'Thông tin cá nhân',
                      subtitle: 'Hồ sơ, hình ảnh và thông tin liên hệ',
                      onTap: () async {
                        await Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const F02EditProfileScreen()),
                        );
                        _refreshProfile();
                      },
                    ),

                    const Divider(height: 1, indent: 56, color: AppColors.border),

                    // Mục 2: Lịch hẹn của tôi (Đồng bộ với C09)
                    _buildMenuItem(
                      icon: Icons.calendar_today_outlined,
                      title: 'Lịch hẹn của tôi',
                      subtitle: 'Quản lý lịch hẹn sắp tới và đã hoàn thành',
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const C09MyAppointmentsScreen()),
                        );
                      },
                    ),

                    const Divider(height: 1, indent: 56, color: AppColors.border),

                    // Mục 3: Cài đặt tài khoản
                    _buildMenuItem(
                      icon: Icons.settings_outlined,
                      title: 'Cài đặt tài khoản',
                      subtitle: 'Ngôn ngữ, thông báo và bảo mật',
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const F08SettingsScreen()),
                        );
                      },
                    ),

                    const Divider(height: 1, indent: 56, color: AppColors.border),

                    // Mục 4: Đăng xuất
                    _buildMenuItem(
                      icon: Icons.logout_rounded,
                      iconColor: AppColors.error,
                      title: 'Đăng xuất',
                      titleColor: AppColors.error,
                      subtitle: 'Thoát tài khoản khỏi thiết bị này',
                      onTap: _handleLogout,
                      showChevron: false,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Thông tin phiên bản & Hotline
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

  Widget _buildMenuItem({
    required IconData icon,
    Color? iconColor,
    required String title,
    Color? titleColor,
    required String subtitle,
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
      subtitle: Text(
        subtitle,
        style: const TextStyle(
          fontSize: 12,
          color: AppColors.textSecondary,
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
