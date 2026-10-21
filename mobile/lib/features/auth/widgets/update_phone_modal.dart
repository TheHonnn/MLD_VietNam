import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/utils/validators.dart';
import '../../membership/data/repositories/membership_repository.dart';

/// Modal Bottom Sheet cho phép khách hàng cập nhật số điện thoại
class UpdatePhoneModal extends StatefulWidget {
  final bool isDismissible;
  final String? reason;

  const UpdatePhoneModal({
    super.key,
    this.isDismissible = true,
    this.reason,
  });

  /// Phương thức tĩnh để mở Modal tiện lợi từ bất cứ đâu trong App
  static Future<bool?> show(
    BuildContext context, {
    bool isDismissible = true,
    String? reason,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isDismissible: isDismissible,
      enableDrag: isDismissible,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => PopScope(
        canPop: isDismissible,
        child: UpdatePhoneModal(
          isDismissible: isDismissible,
          reason: reason,
        ),
      ),
    );
  }

  @override
  State<UpdatePhoneModal> createState() => _UpdatePhoneModalState();
}

class _UpdatePhoneModalState extends State<UpdatePhoneModal> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _phoneController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final phone = _phoneController.text.trim().replaceAll(' ', '');

    try {
      // 1. Lưu vào AuthService và đồng bộ Backend
      await AuthService.instance.updatePhone(phone);

      // 2. Cập nhật hồ sơ thành viên cục bộ
      final repo = MembershipRepository.instance;
      repo.updateProfile(repo.profile.copyWith(
        phone: phone,
        isPhoneVerified: true,
      ));

      if (mounted) {
        setState(() => _isLoading = false);
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đã cập nhật và lưu số điện thoại thành công!'),
            backgroundColor: Color(0xFF236B42),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString().replaceFirst('Exception: ', '');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: bottomInset > 0 ? bottomInset + 16 : 32,
      ),
      decoration: const BoxDecoration(
        color: AppColors.surface, // White
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Thanh kéo nhỏ (indicator)
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // Icon huy hiệu điện thoại
              Center(
                child: Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF7ED),
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0xFFFED7AA), width: 1.5),
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.phone_iphone_rounded,
                      color: Color(0xFFC2410C),
                      size: 28,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Tiêu đề
              const Text(
                'Cập nhật số điện thoại',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textHeading,
                ),
              ),

              const SizedBox(height: 8),

              // Mô tả lý do
              Text(
                widget.reason ??
                    'Tài khoản đăng nhập bằng Email cần bổ sung số điện thoại để nhận thông báo xác nhận lịch hẹn, tư vấn và chăm sóc dịch vụ tại MLD.',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w400,
                  color: AppColors.textSecondary,
                  height: 1.4,
                ),
              ),

              const SizedBox(height: 24),

              // Ô nhập số điện thoại
              TextFormField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                autofocus: true,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
                decoration: InputDecoration(
                  labelText: 'Số điện thoại liên hệ *',
                  labelStyle: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                  hintText: 'Ví dụ: 0912 345 678',
                  hintStyle: const TextStyle(fontSize: 14, color: AppColors.textPlaceholder),
                  prefixIcon: const Icon(
                    Icons.phone_outlined,
                    color: AppColors.primary,
                    size: 22,
                  ),
                  filled: true,
                  fillColor: AppColors.background,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                  ),
                  errorBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: Colors.redAccent),
                  ),
                ),
                validator: AppValidators.phone,
              ),

              if (_errorMessage != null) ...[
                const SizedBox(height: 12),
                Text(
                  _errorMessage!,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: Colors.redAccent,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],

              const SizedBox(height: 20),

              // Nút Lưu số điện thoại
              SizedBox(
                height: 50,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    elevation: 0,
                  ),
                  onPressed: _isLoading ? null : _handleSave,
                  child: _isLoading
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : const Text(
                          'Lưu số điện thoại',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                ),
              ),

              // Nút Để sau (nếu cho phép đóng)
              if (widget.isDismissible) ...[
                const SizedBox(height: 8),
                TextButton(
                  onPressed: _isLoading ? null : () => Navigator.pop(context, false),
                  child: const Text(
                    'Để sau',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
