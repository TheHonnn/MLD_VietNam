import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';
import '../constants/app_colors.dart';
import '../network/api_endpoints.dart';
import '../theme/app_typography.dart';
import 'top_notification_service.dart';

class CatalogImagePickerService {
  CatalogImagePickerService._();
  static final ImagePicker _picker = ImagePicker();

  /// Hiển thị BottomSheet chọn nguồn ảnh từ thiết bị (Camera / Thư viện)
  /// và tự động upload lên Supabase Storage (Bucket: services)
  static Future<String?> pickAndUploadImage({
    required BuildContext context,
    String folderPrefix = 'catalog',
  }) async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE5E7EB),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Tải ảnh từ thiết bị',
                style: AppTypography.zaloFont(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textHeading,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Chọn nguồn ảnh trên thiết bị của bạn để tải lên máy chủ:',
                style: AppTypography.zaloFont(
                  fontSize: 12.5,
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.photo_library_rounded, color: AppColors.primary, size: 22),
                ),
                title: Text(
                  'Chọn từ Thư viện ảnh',
                  style: AppTypography.zaloFont(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                ),
                subtitle: Text(
                  'Chọn ảnh có sẵn trong bộ sưu tập điện thoại',
                  style: AppTypography.zaloFont(fontSize: 11.5, color: AppColors.textSecondary),
                ),
                onTap: () => Navigator.pop(ctx, ImageSource.gallery),
              ),
              const SizedBox(height: 4),
              ListTile(
                leading: Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8F6ED),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.camera_alt_rounded, color: Color(0xFF00693F), size: 22),
                ),
                title: Text(
                  'Chụp ảnh mới từ Camera',
                  style: AppTypography.zaloFont(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textHeading),
                ),
                subtitle: Text(
                  'Chụp ảnh trực tiếp từ máy ảnh',
                  style: AppTypography.zaloFont(fontSize: 11.5, color: AppColors.textSecondary),
                ),
                onTap: () => Navigator.pop(ctx, ImageSource.camera),
              ),
            ],
          ),
        ),
      ),
    );

    if (source == null) return null;

    try {
      final pickedFile = await _picker.pickImage(
        source: source,
        maxWidth: 1600,
        maxHeight: 1600,
        imageQuality: 85,
      );

      if (pickedFile == null) return null;

      // Hiển thị dialog đang tải lên
      if (context.mounted) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (_) => PopScope(
            canPop: false,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 10),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const CircularProgressIndicator(color: Color(0xFF00693F)),
                    const SizedBox(height: 14),
                    Text(
                      'Đang tải ảnh lên máy chủ...',
                      style: AppTypography.zaloFont(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading,
                        decoration: TextDecoration.none,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      }

      final bytes = await pickedFile.readAsBytes();
      final ext = pickedFile.name.split('.').last.toLowerCase();
      final mimeType = (ext == 'png')
          ? 'image/png'
          : (ext == 'webp' ? 'image/webp' : 'image/jpeg');

      final fileName = '${folderPrefix}_${DateTime.now().millisecondsSinceEpoch}.${ext == 'png' ? 'png' : 'jpg'}';
      final uploadUrl = '${ApiEndpoints.supabaseUrl}/storage/v1/object/services/$fileName';

      final dio = Dio();
      final res = await dio.post(
        uploadUrl,
        data: bytes,
        options: Options(
          headers: {
            'apikey': ApiEndpoints.supabaseServiceRoleKey,
            'Authorization': 'Bearer ${ApiEndpoints.supabaseServiceRoleKey}',
            'Content-Type': mimeType,
          },
        ),
      );

      // Đóng dialog loading
      if (context.mounted) {
        Navigator.of(context, rootNavigator: true).pop();
      }

      if (res.statusCode == 200 || res.statusCode == 201) {
        final publicUrl = '${ApiEndpoints.supabaseUrl}/storage/v1/object/public/services/$fileName';
        TopNotificationService.showSuccess(
          title: 'Tải ảnh thành công',
          message: 'Đã tải ảnh lên máy chủ thành công!',
        );
        return publicUrl;
      } else {
        TopNotificationService.showError(
          message: 'Lỗi tải ảnh lên máy chủ (${res.statusCode})',
        );
      }
    } catch (e) {
      // Đóng dialog loading nếu còn mở
      if (context.mounted) {
        try {
          Navigator.of(context, rootNavigator: true).pop();
        } catch (_) {}
      }
      debugPrint('[CatalogImagePickerService] Error: $e');
      TopNotificationService.showError(
        message: 'Lỗi chọn hoặc tải ảnh: $e',
      );
    }
    return null;
  }
}
