import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/services/auth_service.dart';
import '../../../auth/presentation/screens/a03_login_screen.dart';
import '../../data/models/membership_models.dart';
import '../../data/repositories/mock_membership_repository.dart';
import 'f02_edit_profile_screen.dart';

class F08SettingsScreen extends StatefulWidget {
  const F08SettingsScreen({super.key});

  @override
  State<F08SettingsScreen> createState() => _F08SettingsScreenState();
}

class _F08SettingsScreenState extends State<F08SettingsScreen> {
  final MockMembershipRepository _repo = MockMembershipRepository();
  late UserSettings _settings;

  @override
  void initState() {
    super.initState();
    _settings = _repo.settings;
  }

  void _updateSettings(UserSettings updated) {
    setState(() {
      _settings = updated;
    });
    _repo.updateSettings(updated);
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
              // --- 1. HEADER & BACK BUTTON ---
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  InkWell(
                    onTap: () => Navigator.pop(context),
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border, width: 1.0),
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.arrow_back_rounded,
                          size: 20,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              const Text(
                'Cài đặt tài khoản',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textHeading, // #693B20
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Quản lý trải nghiệm, bảo mật và các tùy chọn của bạn.',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  color: AppColors.textSecondary,
                ),
              ),

              const SizedBox(height: 24),

              // --- 2. NHÓM TÀI KHOẢN ---
              _buildSectionTitle('Tài khoản'),
              _buildCardGroup([
                _buildMenuItem(
                  icon: Icons.person_outline_rounded,
                  title: 'Thông tin cá nhân',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const F02EditProfileScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  icon: Icons.shield_outlined,
                  title: 'Bảo mật tài khoản',
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Bảo mật tài khoản & mật khẩu PIN')),
                    );
                  },
                ),
                _buildMenuItem(
                  icon: Icons.smartphone_rounded,
                  title: 'Số điện thoại liên kết',
                  subtitle: '0912 345 678 · Đã xác thực',
                  isLast: true,
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Số điện thoại chính đã xác thực')),
                    );
                  },
                ),
              ]),

              const SizedBox(height: 20),

              // --- 3. NHÓM THÔNG BÁO (Toggles) ---
              _buildSectionTitle('Thông báo'),
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border, width: 1.0),
                ),
                child: Column(
                  children: [
                    _buildToggleRow(
                      title: 'Thông báo lịch hẹn',
                      value: _settings.notifyAppointments,
                      onChanged: (val) {
                        _updateSettings(_settings.copyWith(notifyAppointments: val));
                      },
                    ),
                    const Divider(height: 1, thickness: 1, indent: 16, endIndent: 16, color: Color(0xFFF3E2CE)),
                    _buildToggleRow(
                      title: 'Thông báo liệu trình',
                      value: _settings.notifyTreatments,
                      onChanged: (val) {
                        _updateSettings(_settings.copyWith(notifyTreatments: val));
                      },
                    ),
                    const Divider(height: 1, thickness: 1, indent: 16, endIndent: 16, color: Color(0xFFF3E2CE)),
                    _buildToggleRow(
                      title: 'Thông báo khóa học',
                      value: _settings.notifyCourses,
                      onChanged: (val) {
                        _updateSettings(_settings.copyWith(notifyCourses: val));
                      },
                    ),
                    const Divider(height: 1, thickness: 1, indent: 16, endIndent: 16, color: Color(0xFFF3E2CE)),
                    _buildToggleRow(
                      title: 'Chương trình ưu đãi',
                      value: _settings.notifyPromotions,
                      isLast: true,
                      onChanged: (val) {
                        _updateSettings(_settings.copyWith(notifyPromotions: val));
                      },
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // --- 4. NHÓM TÙY CHỌN ---
              _buildSectionTitle('Tùy chọn'),
              _buildCardGroup([
                _buildMenuItem(
                  icon: Icons.language_rounded,
                  title: 'Ngôn ngữ',
                  subtitle: _settings.language,
                  onTap: () {},
                ),
                _buildMenuItem(
                  icon: Icons.location_on_outlined,
                  title: 'Chi nhánh ưu tiên',
                  subtitle: _settings.preferredBranch,
                  onTap: () {},
                ),
                _buildMenuItem(
                  icon: Icons.wb_sunny_outlined,
                  title: 'Giao diện',
                  subtitle: _settings.theme,
                  isLast: true,
                  onTap: () {},
                ),
              ]),
              const SizedBox(height: 6),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 4.0),
                child: Text(
                  'Một tài khoản dùng tại Chi nhánh Quận 3 và các cơ sở liên kết.',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // --- 5. NHÓM QUYỀN RIÊNG TƯ & BẢO MẬT ---
              _buildSectionTitle('Quyền riêng tư & bảo mật'),
              _buildCardGroup([
                _buildMenuItem(
                  icon: Icons.security_rounded,
                  title: 'Chính sách bảo mật',
                  onTap: () {},
                ),
                _buildMenuItem(
                  icon: Icons.description_outlined,
                  title: 'Điều khoản dịch vụ',
                  onTap: () {},
                ),
                _buildMenuItem(
                  icon: Icons.rule_folder_outlined,
                  title: 'Quyền riêng tư dữ liệu',
                  onTap: () {},
                ),
                _buildMenuItem(
                  icon: Icons.download_rounded,
                  title: 'Yêu cầu xuất dữ liệu',
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Yêu cầu xuất bản sao dữ liệu đã gửi')),
                    );
                  },
                ),
                _buildMenuItem(
                  icon: Icons.person_remove_outlined,
                  title: 'Yêu cầu xóa tài khoản',
                  isLast: true,
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Yêu cầu xóa tài khoản đã được ghi nhận')),
                    );
                  },
                ),
              ]),
              const SizedBox(height: 6),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 4.0),
                child: Text(
                  'Mọi yêu cầu hỗ trợ sẽ được bộ phận CSKH xử lý trong 24 giờ.',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // --- 6. NHÓM HỖ TRỢ ---
              _buildSectionTitle('Hỗ trợ'),
              _buildCardGroup([
                _buildMenuItem(
                  icon: Icons.headset_mic_outlined,
                  title: 'Hotline CSKH',
                  subtitle: '1900 6868',
                  onTap: () {},
                ),
                _buildMenuItem(
                  icon: Icons.help_outline_rounded,
                  title: 'Câu hỏi thường gặp',
                  onTap: () {},
                ),
                _buildMenuItem(
                  icon: Icons.chat_bubble_outline_rounded,
                  title: 'Góp ý ứng dụng',
                  onTap: () {},
                ),
                _buildMenuItem(
                  icon: Icons.info_outline_rounded,
                  title: 'Về MLD Việt Nam',
                  isLast: true,
                  onTap: () {},
                ),
              ]),

              const SizedBox(height: 24),

              // --- 7. ĐĂNG XUẤT ---
              InkWell(
                onTap: () {
                  showDialog(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      backgroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      title: const Text('Đăng xuất'),
                      content: const Text('Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng không?'),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(ctx),
                          child: const Text('Hủy', style: TextStyle(color: AppColors.textSecondary)),
                        ),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                          onPressed: () async {
                            Navigator.pop(ctx);
                            await AuthService.instance.logout();
                            if (context.mounted) {
                              Navigator.pushAndRemoveUntil(
                                context,
                                MaterialPageRoute(builder: (_) => const A03LoginScreen()),
                                (route) => false,
                              );
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Đã đăng xuất thành công')),
                              );
                            }
                          },
                          child: const Text('Đăng xuất', style: TextStyle(color: Colors.white)),
                        ),
                      ],
                    ),
                  );
                },
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  width: double.infinity,
                  height: 48,
                  alignment: Alignment.center,
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.logout_rounded, size: 20, color: AppColors.primary),
                      SizedBox(width: 8),
                      Text(
                        'Đăng xuất',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary, // #985018
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 12),

              Center(
                child: Text(
                  _settings.version,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),

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

  Widget _buildCardGroup(List<Widget> items) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
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
    String? subtitle,
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
          subtitle: subtitle != null
              ? Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textSecondary,
                  ),
                )
              : null,
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

  Widget _buildToggleRow({
    required String title,
    required bool value,
    required ValueChanged<bool> onChanged,
    bool isLast = false,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value ? 'Đang bật' : 'Đang tắt',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w400,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
          Switch(
            value: value,
            activeThumbColor: Colors.white,
            activeTrackColor: AppColors.primary, // #985018
            inactiveThumbColor: Colors.white,
            inactiveTrackColor: AppColors.surfaceDisabled,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }
}
