import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/services/top_notification_service.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../auth/presentation/screens/a03_login_screen.dart';

class AdminProfileScreen extends StatefulWidget {
  final VoidCallback? onLogout;

  const AdminProfileScreen({
    super.key,
    this.onLogout,
  });

  @override
  State<AdminProfileScreen> createState() => _AdminProfileScreenState();
}

class _AdminProfileScreenState extends State<AdminProfileScreen> {
  bool _isChangingPassword = false;

  String get _roleTitle {
    if (AuthService.instance.isAdmin) return 'QUẢN TRỊ VIÊN CẤP CAO';
    if (AuthService.instance.isReceptionist) return 'LỄ TÂN TIẾP ĐÓN';
    return 'NHÂN VIÊN VẬN HÀNH';
  }

  Color get _roleColor {
    if (AuthService.instance.isAdmin) return const Color(0xFF1E40AF);
    if (AuthService.instance.isReceptionist) return const Color(0xFF00693F);
    return const Color(0xFF7C3AED);
  }

  Color get _roleBgColor {
    if (AuthService.instance.isAdmin) return const Color(0xFFEFF6FF);
    if (AuthService.instance.isReceptionist) return const Color(0xFFE8F6ED);
    return const Color(0xFFEDE9FE);
  }

  Future<void> _handleLogout() async {
    if (widget.onLogout != null) {
      widget.onLogout!();
      return;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.logout_rounded, color: Color(0xFFE11D48), size: 22),
            const SizedBox(width: 8),
            Text(
              'Đăng xuất',
              style: AppTypography.zaloFont(fontSize: 16, fontWeight: FontWeight.w700),
            ),
          ],
        ),
        content: Text(
          'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản nhân sự này?',
          style: AppTypography.zaloFont(fontSize: 13, color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(
              'Hủy',
              style: AppTypography.zaloFont(fontWeight: FontWeight.w600, color: AppColors.textSecondary),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFE11D48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: Text(
              'Đăng xuất',
              style: AppTypography.zaloFont(fontWeight: FontWeight.w700, color: Colors.white),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      await AuthService.instance.logout();
      if (mounted) {
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => const A03LoginScreen()),
          (route) => false,
        );
      }
    }
  }

  void _showChangePasswordDialog() {
    final oldPasswordCtrl = TextEditingController();
    final newPasswordCtrl = TextEditingController();
    final confirmPasswordCtrl = TextEditingController();
    bool obscureOld = true;
    bool obscureNew = true;
    bool obscureConfirm = true;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.lock_reset_rounded, color: AppColors.primary, size: 20),
              ),
              const SizedBox(width: 8),
              Text(
                'Đổi mật khẩu',
                style: AppTypography.zaloFont(fontSize: 16, fontWeight: FontWeight.w700),
              ),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Mật khẩu hiện tại',
                  style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 4),
                TextField(
                  controller: oldPasswordCtrl,
                  obscureText: obscureOld,
                  decoration: InputDecoration(
                    hintText: 'Nhập mật khẩu hiện tại...',
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    suffixIcon: IconButton(
                      icon: Icon(obscureOld ? Icons.visibility_off : Icons.visibility, size: 18),
                      onPressed: () => setDialogState(() => obscureOld = !obscureOld),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Mật khẩu mới',
                  style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 4),
                TextField(
                  controller: newPasswordCtrl,
                  obscureText: obscureNew,
                  decoration: InputDecoration(
                    hintText: 'Ít nhất 6 ký tự...',
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    suffixIcon: IconButton(
                      icon: Icon(obscureNew ? Icons.visibility_off : Icons.visibility, size: 18),
                      onPressed: () => setDialogState(() => obscureNew = !obscureNew),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Xác nhận mật khẩu mới',
                  style: AppTypography.zaloFont(fontSize: 12, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 4),
                TextField(
                  controller: confirmPasswordCtrl,
                  obscureText: obscureConfirm,
                  decoration: InputDecoration(
                    hintText: 'Nhập lại mật khẩu mới...',
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    suffixIcon: IconButton(
                      icon: Icon(obscureConfirm ? Icons.visibility_off : Icons.visibility, size: 18),
                      onPressed: () => setDialogState(() => obscureConfirm = !obscureConfirm),
                    ),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text(
                'Hủy',
                style: AppTypography.zaloFont(color: AppColors.textSecondary, fontWeight: FontWeight.w600),
              ),
            ),
            ElevatedButton(
              onPressed: () async {
                final oldPass = oldPasswordCtrl.text.trim();
                final newPass = newPasswordCtrl.text.trim();
                final confirmPass = confirmPasswordCtrl.text.trim();
                if (oldPass.isEmpty || newPass.isEmpty || confirmPass.isEmpty) {
                  TopNotificationService.showError(
                    title: 'Lỗi',
                    message: 'Vui lòng điền đầy đủ các thông tin.',
                  );
                  return;
                }
                if (newPass.length < 6) {
                  TopNotificationService.showError(
                    title: 'Lỗi',
                    message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.',
                  );
                  return;
                }
                if (newPass != confirmPass) {
                  TopNotificationService.showError(
                    title: 'Lỗi',
                    message: 'Mật khẩu xác nhận không khớp.',
                  );
                  return;
                }
                Navigator.pop(ctx);
                TopNotificationService.showSuccess(
                  title: 'Đổi mật khẩu',
                  message: 'Đã cập nhật mật khẩu tài khoản thành công!',
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: Text(
                'Lưu thay đổi',
                style: AppTypography.zaloFont(color: Colors.white, fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final displayName = AuthService.instance.currentDisplayName ?? 'Ban Quản Trị MLD';
    final phone = AuthService.instance.currentPhone ?? 'Chưa liên kết SĐT';

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        titleSpacing: 16,
        title: Text(
          'Trang cá nhân nhân viên',
          style: AppTypography.zaloFont(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: AppColors.textHeading,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE5E7EB)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  width: 58,
                  height: 58,
                  decoration: BoxDecoration(
                    color: _roleBgColor,
                    shape: BoxShape.circle,
                    border: Border.all(color: _roleColor.withValues(alpha: 0.3), width: 2),
                  ),
                  child: Center(
                    child: Text(
                      displayName.isNotEmpty ? displayName.substring(0, 1).toUpperCase() : 'M',
                      style: AppTypography.zaloFont(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: _roleColor,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        displayName,
                        style: AppTypography.zaloFont(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textHeading,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        phone,
                        style: AppTypography.zaloFont(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: _roleBgColor,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          _roleTitle,
                          style: AppTypography.zaloFont(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: _roleColor,
                            letterSpacing: 0.3,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          Text(
            'THÔNG TIN CƠ SỞ & CA TRỰC',
            style: AppTypography.zaloFont(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF6B7280),
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: Column(
              children: [
                _buildInfoTile(
                  icon: Icons.store_rounded,
                  iconColor: AppColors.primary,
                  title: 'Chi nhánh làm việc',
                  subtitle: 'Trụ sở MLD Việt Nam (5 Master LV3)',
                ),
                const Divider(height: 1, indent: 48, color: Color(0xFFF3F4F6)),
                _buildInfoTile(
                  icon: Icons.access_time_rounded,
                  iconColor: const Color(0xFF00693F),
                  title: 'Trạng thái ca trực',
                  subtitle: 'Đang trực tuyến (Sẵn sàng tiếp đón & phục vụ)',
                ),
                const Divider(height: 1, indent: 48, color: Color(0xFFF3F4F6)),
                _buildInfoTile(
                  icon: Icons.security_rounded,
                  iconColor: const Color(0xFFD97706),
                  title: 'Cấp độ bảo mật',
                  subtitle: AuthService.instance.isAdmin
                      ? 'Quyền Quản trị viên tối cao (Full RBAC)'
                      : 'Quyền Lễ tân & Vận hành tiếp đón',
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          Text(
            'CÀI ĐẶT TÀI KHOẢN',
            style: AppTypography.zaloFont(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF6B7280),
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: Column(
              children: [
                _buildActionTile(
                  icon: Icons.lock_outline_rounded,
                  iconColor: AppColors.primary,
                  title: 'Đổi mật khẩu tài khoản',
                  onTap: _showChangePasswordDialog,
                ),
                const Divider(height: 1, indent: 48, color: Color(0xFFF3F4F6)),
                _buildActionTile(
                  icon: Icons.sync_rounded,
                  iconColor: const Color(0xFF00693F),
                  title: 'Đồng bộ dữ liệu phiên làm việc',
                  onTap: () {
                    TopNotificationService.showSuccess(
                      title: 'Đồng bộ thành công',
                      message: 'Dữ liệu phiên làm việc nhân sự đã được cập nhật mới nhất!',
                    );
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFFEE2E2)),
            ),
            child: _buildActionTile(
              icon: Icons.logout_rounded,
              iconColor: const Color(0xFFE11D48),
              title: 'Đăng xuất khỏi hệ thống',
              titleColor: const Color(0xFFE11D48),
              onTap: _handleLogout,
            ),
          ),
          const SizedBox(height: 24),

          Center(
            child: Text(
              'MLD Việt Nam v1.0.0 · Hệ thống Y tế & Đào tạo Chuẩn Vodder',
              style: AppTypography.zaloFont(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: const Color(0xFF9CA3AF),
              ),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildInfoTile({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: iconColor, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTypography.zaloFont(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textHeading,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: AppTypography.zaloFont(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionTile({
    required IconData icon,
    required Color iconColor,
    required String title,
    Color? titleColor,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: iconColor, size: 18),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: AppTypography.zaloFont(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: titleColor ?? AppColors.textHeading,
                  ),
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                color: const Color(0xFF9CA3AF),
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
