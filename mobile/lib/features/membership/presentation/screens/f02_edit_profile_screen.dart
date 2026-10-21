import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
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
    _gender = p.gender;
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

  void _handleSave() {
    if (!(_formKey.currentState?.validate() ?? false)) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    Future.delayed(const Duration(milliseconds: 500), () {
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
      _repo.updateProfile(updated);

      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Cập nhật thông tin cá nhân thành công!'),
            backgroundColor: Color(0xFF236B42),
          ),
        );
        Navigator.pop(context);
      }
    });
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
        const SnackBar(
          content: Text('Đã chọn ảnh đại diện mới. Nhấn "Lưu thay đổi" để áp dụng.'),
          duration: Duration(seconds: 2),
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
      backgroundColor: AppColors.background, // #F8F1E8
      body: SafeArea(
        child: Column(
          children: [
            // Top Scrollable Form
            Expanded(
              child: Form(
                key: _formKey,
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
                      'Thông tin cá nhân',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading, // #693B20
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Quản lý và cập nhật thông tin tài khoản của bạn.',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                      ),
                    ),

                    const SizedBox(height: 24),

                    // --- 2. AVATAR LỚN & ĐỔI ẢNH (88x88, r=44) ---
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
                            p.fullName,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${p.phone} · Đã xác thực',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: AppColors.primary, // #985018
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Ảnh và thông tin mẫu · Không lưu thay đổi thực',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w400,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    // --- 3. BIỂU MẪU HỒ SƠ ---
                    _buildTextField(
                      label: 'Họ và tên *',
                      controller: _fullNameController,
                      hint: 'Nhập họ và tên',
                      validator: AppValidators.fullName,
                    ),
                    const SizedBox(height: 14),

                    // Số điện thoại đã xác thực (Chỉ đọc, fill #F3E2CE)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Số điện thoại đã xác thực',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
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
                              color: AppColors.surfaceSecondary, // #F3E2CE
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.border, width: 1.0),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    (AuthService.instance.currentPhone != null && AuthService.instance.currentPhone!.isNotEmpty)
                                        ? AuthService.instance.currentPhone!
                                        : (p.phone.isNotEmpty ? p.phone : 'Chưa cập nhật — Nhấn để thêm'),
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
                                      ? const Color(0xFF236B42)
                                      : AppColors.primary,
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Số điện thoại tài khoản. Quản lý số liên kết trong phần Cài đặt.',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w400,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 14),

                    _buildTextField(
                      label: 'Email',
                      controller: _emailController,
                      hint: 'Chưa cập nhật email (tùy chọn)',
                      keyboardType: TextInputType.emailAddress,
                      validator: (val) => AppValidators.email(val, isOptional: true),
                    ),
                    const SizedBox(height: 14),

                    _buildTextField(
                      label: 'Ngày sinh',
                      controller: _dobController,
                      hint: 'Chọn ngày sinh (Năm / Tháng / Ngày)',
                      readOnly: true,
                      onTap: _pickDob,
                      suffixIcon: const Icon(Icons.calendar_month_rounded, size: 20, color: AppColors.primary),
                    ),
                    const SizedBox(height: 14),

                    // Giới tính (Dropdown)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Giới tính',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
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
                              items: const [
                                DropdownMenuItem(value: 'Nữ', child: Text('Nữ')),
                                DropdownMenuItem(value: 'Nam', child: Text('Nam')),
                                DropdownMenuItem(value: 'Khác', child: Text('Khác')),
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
                      label: 'Địa chỉ liên hệ',
                      controller: _addressController,
                      hint: 'Chưa cập nhật địa chỉ liên hệ',
                      maxLines: 2,
                    ),
                    const SizedBox(height: 14),

                    _buildTextField(
                      label: 'Nghề nghiệp (không bắt buộc)',
                      controller: _occupationController,
                      hint: 'Chưa cập nhật nghề nghiệp',
                    ),

                    const SizedBox(height: 24),

                    // --- 4. THÔNG TIN LIÊN HỆ KHẨN CẤP ---
                    const Text(
                      'Thông tin liên hệ',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textHeading,
                      ),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Liên hệ khẩn cấp · Không bắt buộc',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 12),

                    _buildTextField(
                      label: 'Tên người liên hệ',
                      controller: _emergencyNameController,
                      hint: 'Nhập tên người liên hệ',
                    ),
                    const SizedBox(height: 14),

                    _buildTextField(
                      label: 'Số điện thoại người liên hệ',
                      controller: _emergencyPhoneController,
                      hint: 'Nhập số điện thoại',
                      keyboardType: TextInputType.phone,
                      validator: (val) => val == null || val.trim().isEmpty ? null : AppValidators.phone(val),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Bạn có thể để trống và bổ sung khi cần.',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                      ),
                    ),

                    const SizedBox(height: 24),

                    // --- 5. THẺ THÔNG TIN QUYỀN RIÊNG TƯ (#F3E2CE, r=20) ---
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
                            'Quyền riêng tư',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textHeading,
                            ),
                          ),
                          SizedBox(height: 8),
                          Text(
                            'Thông tin được dùng để hỗ trợ liên hệ, đặt lịch và chăm sóc khách hàng tốt hơn.',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w400,
                              height: 1.45,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          SizedBox(height: 6),
                          Text(
                            'Bạn chủ động cập nhật thông tin tùy chọn và quản lý quyền bảo mật trong phần Cài đặt.',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w400,
                              height: 1.45,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    const Center(
                      child: Text(
                        'Thông tin liên hệ của bạn',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w400,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),

                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
            ),

            // --- 6. HÀNH ĐỘNG CỐ ĐỊNH (Bottom bar, 350x56 button #985018, r=14) ---
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
                height: 56,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary, // #985018
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  onPressed: _isLoading ? null : _handleSave,
                  child: _isLoading
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : const Text(
                          'Lưu thay đổi',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
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
            fontWeight: FontWeight.w500,
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
              fontSize: 15,
              fontWeight: FontWeight.w400,
              color: AppColors.textPrimary,
            ),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: const TextStyle(
                fontSize: 15,
                color: AppColors.textSecondary,
              ),
              suffixIcon: suffixIcon,
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              errorBorder: InputBorder.none,
              disabledBorder: InputBorder.none,
              errorStyle: const TextStyle(fontSize: 12),
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        ),
      ],
    );
  }
}
