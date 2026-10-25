import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/utils/validators.dart';
import '../../../../core/widgets/profile_image_picker.dart';
import '../../../../core/widgets/vietnamese_dob_picker.dart';
import '../../../membership/data/repositories/membership_repository.dart';
import '../../widgets/primary_button.dart';
import 'a06_purpose_selection_screen.dart';

class A05ProfileSetupScreen extends StatefulWidget {
  final String phone;

  const A05ProfileSetupScreen({
    super.key,
    required this.phone,
  });

  @override
  State<A05ProfileSetupScreen> createState() => _A05ProfileSetupScreenState();
}

class _A05ProfileSetupScreenState extends State<A05ProfileSetupScreen> {
  final _fullNameController = TextEditingController();
  final _dobController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  String? _selectedGender;
  bool _isLoading = false;
  String? _avatarPath;

  Future<void> _pickAvatar() async {
    final picked = await ProfileImagePickerHelper.showPickerModal(
      context,
      currentAvatarUrl: _avatarPath,
    );
    if (picked != null && mounted) {
      setState(() {
        _avatarPath = picked;
      });
    }
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _dobController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
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

  void _handleContinue() async {
    final nameError = AppValidators.fullName(_fullNameController.text);
    if (nameError != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(nameError), backgroundColor: Colors.redAccent),
      );
      return;
    }
    if (_emailController.text.trim().isNotEmpty) {
      final emailError = AppValidators.email(_emailController.text);
      if (emailError != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(emailError), backgroundColor: Colors.redAccent),
        );
        return;
      }
    }

    final enteredPhone = widget.phone.isNotEmpty
        ? widget.phone
        : _phoneController.text.trim().replaceAll(' ', '');

    if (widget.phone.isEmpty && enteredPhone.isNotEmpty) {
      final phoneError = AppValidators.phone(enteredPhone);
      if (phoneError != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(phoneError), backgroundColor: Colors.redAccent),
        );
        return;
      }
    }

    setState(() {
      _isLoading = true;
    });

    if (enteredPhone.isNotEmpty) {
      await AuthService.instance.updatePhone(enteredPhone);
    }

    final fullName = _fullNameController.text.trim();
    final repo = MembershipRepository.instance;
    repo.updateProfile(repo.profile.copyWith(
      fullName: fullName,
      phone: enteredPhone.isNotEmpty ? enteredPhone : repo.profile.phone,
      email: _emailController.text.trim(),
      dateOfBirth: _dobController.text.trim(),
      gender: _selectedGender ?? repo.profile.gender,
      avatarUrl: _avatarPath ?? '',
    ));

    // Persist to AuthService session
    await AuthService.instance.updateProfile(
      displayName: fullName,
      avatarUrl: _avatarPath,
    );

    await Future.delayed(const Duration(milliseconds: 400));

    if (mounted) {
      setState(() {
        _isLoading = false;
      });
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const A06PurposeSelectionScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background, // #F8F1E8
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight - 24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // --- ĐIỀU HƯỚNG HỒ SƠ (BackButton & Label HỒ SƠ CÁ NHÂN) ---
                        Row(
                          children: [
                            InkWell(
                              onTap: () => Navigator.pop(context),
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: AppColors.surface, // white
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: AppColors.border, // #E3D1BF
                                    width: 1.0,
                                  ),
                                ),
                                child: const Icon(
                                  Icons.arrow_back_rounded,
                                  size: 20,
                                  color: AppColors.textPrimary, // #40352F
                                ),
                              ),
                            ),
                            const Expanded(
                              child: Center(
                                child: Text(
                                  'HỒ SƠ CÁ NHÂN',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    letterSpacing: 0.8,
                                    color: AppColors.textSecondary, // #6B6158
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 44), // Cân bằng không gian
                          ],
                        ),

                        const SizedBox(height: 24),

                        // --- TIÊU ĐỀ VÀ MÔ TẢ ---
                        const Text(
                          'Hoàn thiện hồ sơ',
                          style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w600,
                            height: 36.40 / 28,
                            color: AppColors.textHeading, // #693B20
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Vui lòng cập nhật thông tin để chúng tôi phục vụ bạn tốt hơn.',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w400,
                            height: 23.25 / 15,
                            color: AppColors.textSecondary, // #6B6158
                          ),
                        ),

                        const SizedBox(height: 24),

                        // --- CHỈNH SỬA ẢNH ĐẠI DIỆN ---
                        InkWell(
                          onTap: _pickAvatar,
                          borderRadius: BorderRadius.circular(16),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4.0),
                            child: Row(
                              children: [
                                if (_avatarPath != null)
                                  AppProfileAvatar(
                                    avatarUrl: _avatarPath!,
                                    size: 80,
                                    isEditable: true,
                                    onEditTap: _pickAvatar,
                                    borderWidth: 2,
                                  )
                                else
                                  Stack(
                                    children: [
                                      Container(
                                        width: 80,
                                        height: 80,
                                        decoration: BoxDecoration(
                                          color: AppColors.surfaceSecondary, // #F3E2CE
                                          shape: BoxShape.circle,
                                          border: Border.all(color: Colors.white, width: 2),
                                        ),
                                        child: const Center(
                                          child: Icon(
                                            Icons.person_rounded,
                                            size: 38,
                                            color: AppColors.primary, // #985018
                                          ),
                                        ),
                                      ),
                                      Positioned(
                                        bottom: 0,
                                        right: 0,
                                        child: Container(
                                          width: 32,
                                          height: 32,
                                          decoration: BoxDecoration(
                                            color: AppColors.primary, // #985018
                                            shape: BoxShape.circle,
                                            border: Border.all(color: Colors.white, width: 2),
                                          ),
                                          child: const Icon(
                                            Icons.camera_alt_rounded,
                                            size: 15,
                                            color: Colors.white,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        _avatarPath != null ? 'Đổi ảnh đại diện' : 'Thêm ảnh đại diện',
                                        style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.primary, // #985018
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        _avatarPath != null
                                            ? 'Đã chọn ảnh thành công'
                                            : 'Có thể cập nhật sau',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w400,
                                          color: _avatarPath != null
                                              ? AppColors.success
                                              : AppColors.textSecondary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),

                        const SizedBox(height: 24),

                        // --- THÔNG TIN HỒ SƠ ---
                        // 1. Họ và tên *
                        _buildFieldLabel('Họ và tên *'),
                        const SizedBox(height: 8),
                        _buildInputField(
                          controller: _fullNameController,
                          hintText: 'Nhập họ và tên',
                        ),

                        const SizedBox(height: 16),

                        // 2. Số điện thoại
                        _buildFieldLabel('Số điện thoại${widget.phone.isEmpty ? ' (Khuyên dùng)' : ''}'),
                        const SizedBox(height: 8),
                        widget.phone.isNotEmpty
                            ? Container(
                                height: 52,
                                padding: const EdgeInsets.symmetric(horizontal: 16),
                                decoration: BoxDecoration(
                                  color: AppColors.surfaceSecondary, // #F3E2CE
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: AppColors.border, width: 1.0),
                                ),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        widget.phone,
                                        style: const TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w500,
                                          color: AppColors.textPrimary,
                                        ),
                                      ),
                                    ),
                                    const Icon(
                                      Icons.verified_rounded,
                                      size: 20,
                                      color: AppColors.success, // #2E8B57
                                    ),
                                  ],
                                ),
                              )
                            : _buildInputField(
                                controller: _phoneController,
                                hintText: 'Nhập số điện thoại liên hệ (Ví dụ: 0912 345 678)',
                              ),

                        const SizedBox(height: 16),

                        // 3. Ngày sinh & Giới tính
                        Row(
                          children: [
                            // Ngày sinh
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  _buildFieldLabel('Ngày sinh'),
                                  const SizedBox(height: 8),
                                  InkWell(
                                    onTap: _pickDate,
                                    borderRadius: BorderRadius.circular(12),
                                    child: Container(
                                      height: 52,
                                      padding: const EdgeInsets.symmetric(horizontal: 14),
                                      decoration: BoxDecoration(
                                        color: AppColors.surface,
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(color: AppColors.border, width: 1.0),
                                      ),
                                      child: Row(
                                        children: [
                                          Expanded(
                                            child: Text(
                                              _dobController.text.isNotEmpty
                                                  ? _dobController.text
                                                  : 'DD/MM/YYYY',
                                              style: TextStyle(
                                                fontSize: 14,
                                                color: _dobController.text.isNotEmpty
                                                    ? AppColors.textPrimary
                                                    : AppColors.textPlaceholder,
                                              ),
                                            ),
                                          ),
                                          const Icon(
                                            Icons.calendar_month_outlined,
                                            size: 18,
                                            color: AppColors.textSecondary,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 12),
                            // Giới tính
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  _buildFieldLabel('Giới tính'),
                                  const SizedBox(height: 8),
                                  Container(
                                    height: 52,
                                    padding: const EdgeInsets.symmetric(horizontal: 14),
                                    decoration: BoxDecoration(
                                      color: AppColors.surface,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: AppColors.border, width: 1.0),
                                    ),
                                    child: DropdownButtonHideUnderline(
                                      child: DropdownButton<String>(
                                        value: _selectedGender,
                                        isExpanded: true,
                                        hint: const Text(
                                          'Chọn giới tính',
                                          style: TextStyle(
                                            fontSize: 13,
                                            color: AppColors.textPlaceholder,
                                          ),
                                        ),
                                        icon: const Icon(
                                          Icons.keyboard_arrow_down_rounded,
                                          size: 20,
                                          color: AppColors.textSecondary,
                                        ),
                                        items: ['Nữ', 'Nam', 'Khác'].map((String val) {
                                          return DropdownMenuItem<String>(
                                            value: val,
                                            child: Text(
                                              val,
                                              style: const TextStyle(
                                                fontSize: 14,
                                                color: AppColors.textPrimary,
                                              ),
                                            ),
                                          );
                                        }).toList(),
                                        onChanged: (String? newVal) {
                                          if (newVal != null) {
                                            setState(() {
                                              _selectedGender = newVal;
                                            });
                                          }
                                        },
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 16),

                        // 4. Email
                        _buildFieldLabel('Email'),
                        const SizedBox(height: 8),
                        _buildInputField(
                          controller: _emailController,
                          hintText: 'example@email.com',
                        ),

                        const SizedBox(height: 12),

                        // Quy tắc thông tin
                        const Text(
                          '* Bắt buộc. Ngày sinh, giới tính và email là tùy chọn.',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w400,
                            color: AppColors.textSecondary, // #6B6158
                          ),
                        ),
                      ],
                    ),

                    // --- PRIMARY BUTTON "LƯU VÀ TIẾP TỤC" (56px, r=14) ---
                    Padding(
                      padding: const EdgeInsets.only(top: 24.0, bottom: 8.0),
                      child: PrimaryButton(
                        text: 'Lưu và tiếp tục',
                        isLoading: _isLoading,
                        onPressed: _handleContinue,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildFieldLabel(String label) {
    return Text(
      label,
      style: const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w500,
        height: 20.15 / 13,
        color: AppColors.textPrimary, // #40352F
      ),
    );
  }

  Widget _buildInputField({
    required TextEditingController controller,
    required String hintText,
  }) {
    return Container(
      height: 52,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: AppColors.surface, // white
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppColors.border, // #E3D1BF
          width: 1.0,
        ),
      ),
      child: Center(
        child: TextField(
          controller: controller,
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w400,
            color: AppColors.textPrimary,
          ),
          decoration: InputDecoration(
            hintText: hintText,
            hintStyle: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w400,
              color: AppColors.textPlaceholder,
            ),
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            errorBorder: InputBorder.none,
            disabledBorder: InputBorder.none,
            contentPadding: EdgeInsets.zero,
            isDense: true,
          ),
        ),
      ),
    );
  }
}
