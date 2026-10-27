import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/localization/app_translation.dart';
import '../../../../core/utils/validators.dart';
import '../../../../core/widgets/profile_image_picker.dart';
import '../../../../core/widgets/vietnamese_dob_picker.dart';
import '../../data/repositories/membership_repository.dart';
import '../../../../core/services/auth_service.dart';
import '../../../auth/widgets/update_phone_modal.dart';

class F02EditProfileScreen extends StatefulWidget {
  const F02EditProfileScreen({super.key});

  @override
  State<F02EditProfileScreen> createState() => _F02EditProfileScreenState();
}

class _F02EditProfileScreenState extends State<F02EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final MembershipRepository _repo = MembershipRepository.instance;

  late TextEditingController _fullNameController;
  late TextEditingController _emailController;
  late TextEditingController _dobController;
  late TextEditingController _addressController;
  late TextEditingController _occupationController;
  late TextEditingController _emergencyNameController;
  late TextEditingController _emergencyPhoneController;

  String _gender = 'Nữ';
  bool _isLoading = false;
  late String _currentAvatarUrl;

  @override
  void initState() {
    super.initState();
    final p = _repo.profile;
    _currentAvatarUrl = p.avatarUrl;
    _fullNameController = TextEditingController(text: p.fullName);
    _emailController = TextEditingController(text: p.email);
    _dobController = TextEditingController(text: p.dateOfBirth);
    _addressController = TextEditingController(text: p.address);
    _occupationController = TextEditingController(text: p.occupation);
    _emergencyNameController = TextEditingController(text: p.emergencyContactName);
    _emergencyPhoneController = TextEditingController(text: p.emergencyContactPhone);
    _gender = p.gender.isNotEmpty ? p.gender : 'Nữ';
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _dobController.dispose();
    _addressController.dispose();
    _occupationController.dispose();
    _emergencyNameController.dispose();
    _emergencyPhoneController.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    if (!(_formKey.currentState?.validate() ?? false)) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final updated = _repo.profile.copyWith(
        avatarUrl: _currentAvatarUrl,
        fullName: _fullNameController.text.trim(),
        email: _emailController.text.trim(),
        dateOfBirth: _dobController.text.trim(),
        gender: _gender,
        address: _addressController.text.trim(),
        occupation: _occupationController.text.trim(),
        emergencyContactName: _emergencyNameController.text.trim(),
        emergencyContactPhone: _emergencyPhoneController.text.trim(),
      );
      await _repo.updateProfile(updated);

      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(context.tr('Cập nhật thông tin cá nhân thành công!', 'Profile updated successfully!')),
            backgroundColor: const Color(0xFF059669),
          ),
        );
        Navigator.pop(context);
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(context.tr('Đã lưu thông tin vào thiết bị.', 'Saved profile locally.')),
            backgroundColor: AppColors.primary,
          ),
        );
        Navigator.pop(context);
      }
    }
  }

  Future<void> _pickAvatar() async {
    final newPath = await ProfileImagePickerHelper.showPickerModal(
      context,
      currentAvatarUrl: _currentAvatarUrl,
    );
    if (newPath != null && mounted) {
      setState(() {
        _currentAvatarUrl = newPath;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(context.tr('Đã chọn ảnh đại diện mới. Nhấn "Lưu thay đổi" để áp dụng.', 'New avatar selected. Tap "Save changes" to apply.')),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _pickDob() async {
    DateTime initial = DateTime(2000, 1, 1);
    if (_dobController.text.isNotEmpty) {
      try {
        final parts = _dobController.text.split('/');
        if (parts.length == 3) {
          initial = DateTime(int.parse(parts[2]), int.parse(parts[1]), int.parse(parts[0]));
        }
      } catch (_) {}
    }

    final picked = await VietnameseDobPicker.show(
      context,
      initialDate: initial,
      minYear: 1940,
      maxYear: DateTime.now().year,
    );

    if (picked != null) {
      final day = picked.day.toString().padLeft(2, '0');
      final month = picked.month.toString().padLeft(2, '0');
      final year = picked.year.toString();
      setState(() {
        _dobController.text = '$day/$month/$year';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = _repo.profile;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          context.tr('Thông tin cá nhân', 'Personal Information'),
          style: const TextStyle(
            fontFamily: 'Montserrat',
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: Form(
                key: _formKey,
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // --- 1. AVATAR LỚN & ĐỔI ẢNH ---
                      Center(
                        child: Column(
                          children: [
                            AppProfileAvatar(
                              avatarUrl: _currentAvatarUrl,
                              size: 88,
                              isEditable: true,
                              borderWidth: 2,
                              onEditTap: _pickAvatar,
                            ),
                            const SizedBox(height: 12),
                            Text(
                              p.fullName.isNotEmpty ? p.fullName : context.tr('Học viên MLD', 'MLD Student'),
                              style: const TextStyle(
                                fontFamily: 'Montserrat',
                                fontSize: 17,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              p.phone.isNotEmpty
                                  ? '${p.phone} · ${context.tr('Đã xác thực', 'Verified')}'
                                  : (AuthService.instance.currentPhone ?? context.tr('Chưa cập nhật số điện thoại', 'No phone set')),
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 24),

                      // --- 2. BIỂU MẪU HỒ SƠ ---
                      _buildTextField(
                        label: '${context.tr('Họ và tên', 'Full Name')} *',
                        controller: _fullNameController,
                        hint: context.tr('Nhập họ và tên', 'Enter full name'),
                        validator: AppValidators.fullName,
                      ),
                      const SizedBox(height: 14),

                      // Số điện thoại (Chỉ đọc)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            context.tr('Số điện thoại tài khoản', 'Account Phone Number'),
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 6),
                          InkWell(
                            onTap: () async {
                              final updated = await UpdatePhoneModal.show(context);
                              if (updated == true && mounted) {
                                setState(() {});
                              }
                            },
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              height: 52,
                              padding: const EdgeInsets.symmetric(horizontal: 14),
                              alignment: Alignment.centerLeft,
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppColors.border, width: 1.0),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      (AuthService.instance.currentPhone != null && AuthService.instance.currentPhone!.isNotEmpty)
                                          ? AuthService.instance.currentPhone!
                                          : (p.phone.isNotEmpty ? p.phone : context.tr('Chưa cập nhật — Nhấn để thêm', 'Not set — Tap to add')),
                                      style: TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w500,
                                        color: (p.phone.isNotEmpty || (AuthService.instance.currentPhone?.isNotEmpty ?? false))
                                            ? AppColors.textPrimary
                                            : AppColors.primary,
                                      ),
                                    ),
                                  ),
                                  Icon(
                                    (p.phone.isNotEmpty || (AuthService.instance.currentPhone?.isNotEmpty ?? false))
                                        ? Icons.verified_rounded
                                        : Icons.edit_outlined,
                                    size: 18,
                                    color: (p.phone.isNotEmpty || (AuthService.instance.currentPhone?.isNotEmpty ?? false))
                                        ? const Color(0xFF059669)
                                        : AppColors.primary,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 14),

                      _buildTextField(
                        label: 'Email',
                        controller: _emailController,
                        hint: context.tr('Chưa cập nhật email (tùy chọn)', 'Enter email (optional)'),
                        keyboardType: TextInputType.emailAddress,
                        validator: (val) => AppValidators.email(val, isOptional: true),
                      ),
                      const SizedBox(height: 14),

                      _buildTextField(
                        label: context.tr('Ngày sinh', 'Date of Birth'),
                        controller: _dobController,
                        hint: context.tr('Chọn ngày sinh (Ngày/Tháng/Năm)', 'Select date of birth (DD/MM/YYYY)'),
                        readOnly: true,
                        onTap: _pickDob,
                        suffixIcon: const Icon(Icons.calendar_month_rounded, size: 20, color: AppColors.primary),
                      ),
                      const SizedBox(height: 14),

                      // Giới tính (Dropdown)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            context.tr('Giới tính', 'Gender'),
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            height: 52,
                            padding: const EdgeInsets.symmetric(horizontal: 14),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.border, width: 1.0),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _gender,
                                isExpanded: true,
                                icon: const Icon(Icons.keyboard_arrow_down_rounded, color: AppColors.textSecondary),
                                items: [
                                  DropdownMenuItem(value: 'Nữ', child: Text(context.tr('Nữ', 'Female'))),
                                  DropdownMenuItem(value: 'Nam', child: Text(context.tr('Nam', 'Male'))),
                                  DropdownMenuItem(value: 'Khác', child: Text(context.tr('Khác', 'Other'))),
                                ],
                                onChanged: (val) {
                                  if (val != null) setState(() => _gender = val);
                                },
                              ),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 14),

                      _buildTextField(
                        label: context.tr('Địa chỉ liên hệ', 'Address'),
                        controller: _addressController,
                        hint: context.tr('Chưa cập nhật địa chỉ liên hệ', 'Enter address'),
                        maxLines: 2,
                      ),
                      const SizedBox(height: 14),

                      _buildTextField(
                        label: context.tr('Nghề nghiệp (không bắt buộc)', 'Occupation (optional)'),
                        controller: _occupationController,
                        hint: context.tr('Chưa cập nhật nghề nghiệp', 'Enter occupation'),
                      ),

                      const SizedBox(height: 24),

                      // --- 3. THÔNG TIN LIÊN HỆ KHẨN CẤP ---
                      Text(
                        context.tr('Liên hệ khẩn cấp', 'Emergency Contact'),
                        style: const TextStyle(
                          fontFamily: 'Montserrat',
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 12),

                      _buildTextField(
                        label: context.tr('Tên người liên hệ', 'Contact Name'),
                        controller: _emergencyNameController,
                        hint: context.tr('Nhập tên người liên hệ', 'Enter contact name'),
                      ),
                      const SizedBox(height: 14),

                      _buildTextField(
                        label: context.tr('Số điện thoại người liên hệ', 'Contact Phone'),
                        controller: _emergencyPhoneController,
                        hint: context.tr('Nhập số điện thoại', 'Enter phone number'),
                        keyboardType: TextInputType.phone,
                        validator: (val) => val == null || val.trim().isEmpty ? null : AppValidators.phone(val),
                      ),

                      const SizedBox(height: 24),

                      // --- 4. THẺ BẢO MẬT & QUYỀN RIÊNG TƯ ---
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: AppColors.border, width: 1.0),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.shield_outlined, size: 20, color: AppColors.primary),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                context.tr(
                                  'Thông tin cá nhân của bạn được bảo mật tuyệt đối theo tiêu chuẩn mã hóa và bảo vệ dữ liệu y khoa của MLD Vietnam.',
                                  'Your personal information is securely encrypted and protected in accordance with MLD Vietnam medical data standards.',
                                ),
                                style: const TextStyle(
                                  fontSize: 12.5,
                                  height: 1.45,
                                  color: AppColors.textSecondary,
                                ),
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
            ),

            // --- 5. NÚT LƯU THAY ĐỔI DƯỚI CÙNG ---
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(
                  top: BorderSide(color: AppColors.border, width: 1.0),
                ),
              ),
              child: SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
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
                      : Text(
                          context.tr('Lưu thay đổi', 'Save Changes'),
                          style: const TextStyle(
                            fontFamily: 'Montserrat',
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField({
    required String label,
    required TextEditingController controller,
    required String hint,
    TextInputType keyboardType = TextInputType.text,
    int maxLines = 1,
    String? Function(String?)? validator,
    bool readOnly = false,
    VoidCallback? onTap,
    Widget? suffixIcon,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border, width: 1.0),
          ),
          child: TextFormField(
            controller: controller,
            keyboardType: keyboardType,
            maxLines: maxLines,
            validator: validator,
            readOnly: readOnly,
            onTap: onTap,
            style: const TextStyle(
              fontSize: 14.5,
              fontWeight: FontWeight.w500,
              color: AppColors.textPrimary,
            ),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: const TextStyle(
                fontSize: 14,
                color: AppColors.textPlaceholder,
              ),
              suffixIcon: suffixIcon,
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              errorBorder: InputBorder.none,
              disabledBorder: InputBorder.none,
              errorStyle: const TextStyle(fontSize: 11.5),
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        ),
      ],
    );
  }
}
