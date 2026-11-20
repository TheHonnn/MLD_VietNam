import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/services/top_notification_service.dart';
import '../../../../core/theme/app_typography.dart';
import '../../data/models/admin_models.dart';
import '../../data/repositories/admin_repository.dart';

Future<bool> showEditStudentCodeDialog({
  required BuildContext context,
  required AdminCandidateModel candidate,
  required AdminRepository repository,
}) async {
  if (candidate.studentId.isEmpty) {
    TopNotificationService.showError(
      message: 'Hồ sơ chưa liên kết tài khoản học viên để gán mã.',
    );
    return false;
  }

  final controller = TextEditingController(text: candidate.studentCode ?? '');
  String? errorText;
  bool isSaving = false;
  bool didSave = false;

  String generateSuggestion() {
    final suffix = DateTime.now().millisecondsSinceEpoch.toString().substring(8);
    return 'HV26-$suffix';
  }

  await showDialog<void>(
    context: context,
    barrierDismissible: !isSaving,
    builder: (dialogContext) => StatefulBuilder(
      builder: (ctx, setDialogState) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFE8F6ED),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.badge_rounded, color: Color(0xFF00693F), size: 20),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Cấp / Chỉnh sửa Mã học viên',
                    style: AppTypography.zaloFont(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textHeading,
                    ),
                  ),
                  Text(
                    candidate.candidateName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.zaloFont(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Khi gán Mã học viên, tài khoản của khách hàng trên App sẽ tự động kích hoạt tư cách Học viên.',
              style: AppTypography.zaloFont(
                fontSize: 11.5,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              enabled: !isSaving,
              textCapitalization: TextCapitalization.characters,
              decoration: InputDecoration(
                labelText: 'Mã học viên (tùy chỉnh)',
                hintText: 'VD: HV26-001',
                errorText: errorText,
                filled: true,
                fillColor: const Color(0xFFF9FAFB),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: isSaving
                    ? null
                    : () {
                        setDialogState(() {
                          controller.text = generateSuggestion();
                          errorText = null;
                        });
                      },
                icon: const Icon(Icons.auto_fix_high_rounded, size: 15, color: Color(0xFF00693F)),
                label: Text(
                  'Gợi ý mã tự động',
                  style: AppTypography.zaloFont(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF00693F),
                  ),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: isSaving ? null : () => Navigator.pop(dialogContext),
            child: Text(
              'Hủy',
              style: AppTypography.zaloFont(color: AppColors.textSecondary, fontWeight: FontWeight.w600),
            ),
          ),
          ElevatedButton(
            onPressed: isSaving
                ? null
                : () async {
                    setDialogState(() {
                      isSaving = true;
                      errorText = null;
                    });
                    final err = await repository.updateCandidateStudentCode(
                      studentId: candidate.studentId,
                      studentCode: controller.text,
                      currentRole: candidate.studentRole,
                    );
                    if (err == null) {
                      didSave = true;
                      if (dialogContext.mounted) Navigator.pop(dialogContext);
                      TopNotificationService.showSuccess(
                        title: 'Đã lưu Mã học viên',
                        message: controller.text.trim().isNotEmpty
                            ? 'Mã ${controller.text.trim()} đã gắn cho ${candidate.candidateName}.'
                            : 'Đã xóa mã học viên của ${candidate.candidateName}.',
                      );
                    } else {
                      if (dialogContext.mounted) {
                        setDialogState(() {
                          isSaving = false;
                          errorText = err;
                        });
                      }
                    }
                  },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00693F),
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: isSaving
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : Text('Lưu mã HV', style: AppTypography.zaloFont(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    ),
  );

  controller.dispose();
  return didSave;
}
