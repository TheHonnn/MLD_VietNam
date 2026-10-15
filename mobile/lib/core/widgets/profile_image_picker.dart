import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../constants/app_colors.dart';
import 'smart_image.dart';

/// Helper và Widget chuẩn để hiển thị và chọn ảnh đại diện hồ sơ trên toàn ứng dụng
class ProfileImagePickerHelper {
  static final ImagePicker _picker = ImagePicker();

  /// Hiển thị BottomSheet cho phép người dùng chọn nguồn ảnh:
  /// - Chụp ảnh mới (Camera)
  /// - Chọn từ thư viện (Gallery)
  /// - Khôi phục ảnh mặc định
  static Future<String?> showPickerModal(
    BuildContext context, {
    String? currentAvatarUrl,
    String defaultAsset = 'assets/images/le_hoai_an.png',
  }) async {
    return showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => Container(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Thanh gạt modal
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              const Text(
                'Ảnh đại diện',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textHeading,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Chọn nguồn ảnh bạn muốn sử dụng làm ảnh hồ sơ cá nhân.',
                style: TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 20),

              // Tùy chọn 1: Chụp ảnh từ camera
              _buildOptionTile(
                icon: Icons.camera_alt_outlined,
                title: 'Chụp ảnh mới',
                subtitle: 'Sử dụng máy ảnh của thiết bị',
                onTap: () async {
                  final picked = await _picker.pickImage(
                    source: ImageSource.camera,
                    maxWidth: 1024,
                    maxHeight: 1024,
                    imageQuality: 85,
                  );
                  if (ctx.mounted) {
                    Navigator.pop(ctx, picked?.path);
                  }
                },
              ),
              const SizedBox(height: 12),

              // Tùy chọn 2: Chọn từ thư viện
              _buildOptionTile(
                icon: Icons.photo_library_outlined,
                title: 'Chọn từ thư viện ảnh',
                subtitle: 'Tải ảnh có sẵn trên máy',
                onTap: () async {
                  final picked = await _picker.pickImage(
                    source: ImageSource.gallery,
                    maxWidth: 1024,
                    maxHeight: 1024,
                    imageQuality: 85,
                  );
                  if (ctx.mounted) {
                    Navigator.pop(ctx, picked?.path);
                  }
                },
              ),
              const SizedBox(height: 12),

              // Tùy chọn 3: Đặt lại ảnh mặc định
              if (currentAvatarUrl != null && currentAvatarUrl != defaultAsset) ...[
                _buildOptionTile(
                  icon: Icons.restart_alt_rounded,
                  title: 'Sử dụng ảnh mẫu mặc định',
                  subtitle: 'Khôi phục hình đại diện mẫu ban đầu',
                  color: AppColors.secondary,
                  onTap: () {
                    Navigator.pop(ctx, defaultAsset);
                  },
                ),
                const SizedBox(height: 12),
              ],

              // Nút Hủy
              SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(ctx),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.border),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: const Text(
                    'Hủy',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static Widget _buildOptionTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    Color color = AppColors.primary,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.surfaceSecondary.withValues(alpha: 0.35),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border.withValues(alpha: 0.7)),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.chevron_right_rounded,
              color: AppColors.textSecondary,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
}

/// Widget chuẩn hiển thị Avatar đại diện cho toàn bộ app (tròn, hỗ trợ asset / file / network, kèm nút camera nếu editable)
class AppProfileAvatar extends StatelessWidget {
  final String avatarUrl;
  final double size;
  final bool isEditable;
  final VoidCallback? onEditTap;
  final Color borderColor;
  final double borderWidth;
  final bool showShadow;

  const AppProfileAvatar({
    super.key,
    required this.avatarUrl,
    this.size = 64,
    this.isEditable = false,
    this.onEditTap,
    this.borderColor = AppColors.secondary,
    this.borderWidth = 1.5,
    this.showShadow = true,
  });

  @override
  Widget build(BuildContext context) {
    final avatarWidget = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: borderColor, width: borderWidth),
        boxShadow: showShadow
            ? [
                BoxShadow(
                  color: borderColor.withValues(alpha: 0.2),
                  blurRadius: size * 0.12,
                  offset: Offset(0, size * 0.04),
                ),
              ]
            : null,
      ),
      child: ClipOval(
        child: SmartImage(
          imageUrl: avatarUrl,
          fit: BoxFit.cover,
          width: size,
          height: size,
          placeholder: Container(
            color: AppColors.surfaceSecondary,
            child: Icon(
              Icons.person,
              color: AppColors.primary,
              size: size * 0.5,
            ),
          ),
        ),
      ),
    );

    if (!isEditable) {
      return avatarWidget;
    }

    final badgeSize = (size * 0.36).clamp(28.0, 36.0);

    return InkWell(
      onTap: onEditTap,
      borderRadius: BorderRadius.circular(size / 2),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          avatarWidget,
          Positioned(
            right: 0,
            bottom: 0,
            child: Container(
              width: badgeSize,
              height: badgeSize,
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.border, width: 1.0),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.12),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Icon(
                Icons.camera_alt_outlined,
                size: badgeSize * 0.5,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
