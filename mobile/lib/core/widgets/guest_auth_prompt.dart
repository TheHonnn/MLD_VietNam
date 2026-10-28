import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import '../services/auth_service.dart';
import '../../features/auth/presentation/screens/a03_login_screen.dart';

/// Hộp thoại nhắc đăng nhập khi người dùng đang ở chế độ khách (Guest Mode)
/// và thực hiện các hành động yêu cầu danh tính cá nhân.
class GuestAuthPrompt {
  /// Kiểm tra trạng thái đăng nhập.
  /// Nếu chưa đăng nhập, hiển thị bottom sheet nhắc đăng nhập / đăng ký.
  /// Trả về `true` nếu đã đăng nhập hoặc vừa đăng nhập thành công, `false` nếu bỏ qua.
  static Future<bool> ensureLoggedIn(
    BuildContext context, {
    String title = 'Đăng nhập để tiếp tục',
    String message = 'Quý khách vui lòng đăng nhập hoặc đăng ký tài khoản để thực hiện thao tác này.',
  }) async {
    if (AuthService.instance.isLoggedIn) {
      return true;
    }

    await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => Container(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          boxShadow: [
            BoxShadow(
              color: Colors.black12,
              blurRadius: 20,
              offset: Offset(0, -4),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Thanh gạt modal
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),

            // Icon biểu trưng
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.lock_person_outlined,
                color: AppColors.primary,
                size: 32,
              ),
            ),
            const SizedBox(height: 16),

            // Tiêu đề
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppColors.textHeading,
              ),
            ),
            const SizedBox(height: 10),

            // Nội dung giải thích
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontFamily: 'Montserrat',
                fontSize: 14,
                color: AppColors.textSecondary,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 24),

            // Nút bấm Đăng nhập / Đăng ký
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () async {
                  Navigator.pop(ctx, true);
                  await Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const A03LoginScreen()),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  'Đăng nhập / Đăng ký ngay',
                  style: TextStyle(
                    fontFamily: 'Montserrat',
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 10),

            // Nút Để sau
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text(
                'Để sau',
                style: TextStyle(
                  fontFamily: 'Montserrat',
                  color: AppColors.textSecondary,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );

    return AuthService.instance.isLoggedIn;
  }
}

