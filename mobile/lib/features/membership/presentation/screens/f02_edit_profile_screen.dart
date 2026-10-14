import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../data/repositories/mock_membership_repository.dart';

class F02EditProfileScreen extends StatefulWidget {
  const F02EditProfileScreen({super.key});

  @override
  State<F02EditProfileScreen> createState() => _F02EditProfileScreenState();
}

class _F02EditProfileScreenState extends State<F02EditProfileScreen> {
  final MockMembershipRepository _repo = MockMembershipRepository();

  late TextEditingController _fullNameController;
  late TextEditingController _emailController;
  late TextEditingController _dobController;
  late TextEditingController _addressController;
  late TextEditingController _occupationController;
  late TextEditingController _emergencyNameController;
  late TextEditingController _emergencyPhoneController;

  String _gender = 'Nữ';
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    final p = _repo.profile;
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
    if (_fullNameController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng nhập họ và tên')),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    Future.delayed(const Duration(milliseconds: 500), () {
      final updated = _repo.profile.copyWith(
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
                        const Text(
                          'Dữ liệu minh họa',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w400,
                            color: AppColors.textSecondary,
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
                          Stack(
                            children: [
                              Container(
                                width: 88,
                                height: 88,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(color: AppColors.secondary, width: 2),
                                  boxShadow: [
                                    BoxShadow(
                                      color: AppColors.secondary.withValues(alpha: 0.2),
                                      blurRadius: 10,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: ClipOval(
                                  child: Image.asset(
                                    p.avatarUrl,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => Container(
                                      color: AppColors.surfaceSecondary,
                                      child: const Icon(Icons.person, size: 48, color: AppColors.primary),
                                    ),
                                  ),
                                ),
                              ),
                              Positioned(
                                right: 0,
                                bottom: 0,
                                child: Container(
                                  width: 32,
                                  height: 32,
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    shape: BoxShape.circle,
                                    border: Border.all(color: AppColors.border, width: 1.0),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.08),
                                        blurRadius: 4,
                                        offset: const Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  child: const Icon(
                                    Icons.camera_alt_outlined,
                                    size: 16,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                              ),
                            ],
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
                        Container(
                          height: 52,
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          alignment: Alignment.centerLeft,
                          decoration: BoxDecoration(
                            color: AppColors.surfaceSecondary, // #F3E2CE
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.border, width: 1.0),
                          ),
                          child: Text(
                            p.phone,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Số điện thoại chỉ đọc. Quản lý số liên kết trong phần Cài đặt.',
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
                      hint: 'example@email.com',
                      keyboardType: TextInputType.emailAddress,
                    ),
                    const SizedBox(height: 14),

                    _buildTextField(
                      label: 'Ngày sinh',
                      controller: _dobController,
                      hint: 'DD/MM/YYYY',
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
                      label: 'Địa chỉ liên hệ (minh họa)',
                      controller: _addressController,
                      hint: 'Địa chỉ nhà...',
                      maxLines: 2,
                    ),
                    const SizedBox(height: 14),

                    _buildTextField(
                      label: 'Nghề nghiệp (không bắt buộc)',
                      controller: _occupationController,
                      hint: 'Nhập nghề nghiệp...',
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
                        'Dữ liệu minh họa · Địa chỉ và nghề nghiệp là ví dụ',
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
          child: TextField(
            controller: controller,
            keyboardType: keyboardType,
            maxLines: maxLines,
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
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              errorBorder: InputBorder.none,
              disabledBorder: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        ),
      ],
    );
  }
}
