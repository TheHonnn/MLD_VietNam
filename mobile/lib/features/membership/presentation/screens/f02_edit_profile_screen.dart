import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
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
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          context.tr('Thông tin cá nhân', 'Personal Information'),
          style: GoogleFonts.beVietnamPro(
            fontSize: 17.5,
            fontWeight: FontWeight.w700,
            color: const Color(0xFF0F172A),
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
                  padding: const EdgeInsets.symmetric(horizontal: 18.0, vertical: 16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // --- 1. AVATAR LỚN & ĐỔI ẢNH (BỎ VIỀN, NỔI BẬT KHỐI) ---
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.04),
                              blurRadius: 10,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: Center(
                          child: Column(
                            children: [
                              AppProfileAvatar(
                                avatarUrl: _currentAvatarUrl,
                                size: 88,
                                isEditable: true,
                                borderWidth: 0,
                                onEditTap: _pickAvatar,
                              ),
                              const SizedBox(height: 12),
                              Text(
                                p.fullName.isNotEmpty ? p.fullName : context.tr('Khách hàng MLD', 'MLD Customer'),
                                style: GoogleFonts.beVietnamPro(
                                  fontSize: 17,
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF0F172A),
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                p.phone.isNotEmpty
                                    ? '${p.phone} · ${context.tr('Đã xác thực', 'Verified')}'
                                    : (AuthService.instance.currentPhone ?? context.tr('Chưa cập nhật số điện thoại', 'No phone set')),
                                style: GoogleFonts.beVietnamPro(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: const Color(0xFF003876),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: 20),

                      // --- 2. BIỂU MẪU HỒ SƠ ---
                      _buildTextField(
                        label: '${context.tr('Họ và tên', 'Full Name')} *',
                        controller: _fullNameController,
                        hint: context.tr('Nhập họ và tên', 'Enter full name'),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Vui lòng nhập họ và tên';
                          }
                          if (val.trim().length < 2) {
                            return 'Họ và tên phải có ít nhất 2 ký tự';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),

                      // Số điện thoại (Chỉ đọc)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            context.tr('Số điện thoại tài khoản', 'Account Phone Number'),
                            style: GoogleFonts.beVietnamPro(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF0F172A),
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
                            borderRadius: BorderRadius.circular(14),
                            child: Container(
                              height: 52,
                              padding: const EdgeInsets.symmetric(horizontal: 14),
                              alignment: Alignment.centerLeft,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(14),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.04),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      (AuthService.instance.currentPhone != null && AuthService.instance.currentPhone!.isNotEmpty)
                                          ? AuthService.instance.currentPhone!
                                          : (p.phone.isNotEmpty ? p.phone : context.tr('Chưa cập nhật — Nhấn để thêm', 'Not set — Tap to add')),
                                      style: GoogleFonts.beVietnamPro(
                                        fontSize: 14.5,
                                        fontWeight: FontWeight.w500,
                                        color: (p.phone.isNotEmpty || (AuthService.instance.currentPhone?.isNotEmpty ?? false))
                                            ? const Color(0xFF0F172A)
                                            : const Color(0xFF003876),
                                      ),
                                    ),
                                  ),
                                  Icon(
                                    (p.phone.isNotEmpty || (AuthService.instance.currentPhone?.isNotEmpty ?? false))
                                        ? Icons.verified_rounded
                                        : Icons.edit_outlined,
                                    size: 18,
                                    color: (p.phone.isNotEmpty || (AuthService.instance.currentPhone?.isNotEmpty ?? false))
                                        ? const Color(0xFF16A34A)
                                        : const Color(0xFF003876),
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
                        suffixIcon: const Icon(Icons.calendar_month_rounded, size: 20, color: Color(0xFF003876)),
                      ),
                      const SizedBox(height: 14),

                      // Giới tính (Dropdown)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            context.tr('Giới tính', 'Gender'),
                            style: GoogleFonts.beVietnamPro(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF0F172A),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            height: 52,
                            padding: const EdgeInsets.symmetric(horizontal: 14),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(14),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.04),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _gender,
                                isExpanded: true,
                                icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF64748B)),
                                style: GoogleFonts.beVietnamPro(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w500,
                                  color: const Color(0xFF0F172A),
                                ),
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
                        style: GoogleFonts.beVietnamPro(
                          fontSize: 15.5,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF0F172A),
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

                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ),
            ),

            // --- 5. NÚT LƯU THAY ĐỔI DƯỚI CÙNG (6-3-1 DESIGN, SHADOW MỎNG) ---
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                    offset: const Offset(0, -3),
                  ),
                ],
              ),
              child: SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF003876), // 30% Dark Navy
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
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
                          style: GoogleFonts.beVietnamPro(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.3,
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
          style: GoogleFonts.beVietnamPro(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF0F172A),
          ),
        ),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: TextFormField(
            controller: controller,
            keyboardType: keyboardType,
            maxLines: maxLines,
            validator: validator,
            readOnly: readOnly,
            onTap: onTap,
            style: GoogleFonts.beVietnamPro(
              fontSize: 14.5,
              fontWeight: FontWeight.w500,
              color: const Color(0xFF0F172A),
            ),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: GoogleFonts.beVietnamPro(
                fontSize: 14,
                color: const Color(0xFF94A3B8),
              ),
              suffixIcon: suffixIcon,
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              errorBorder: InputBorder.none,
              disabledBorder: InputBorder.none,
              errorStyle: GoogleFonts.beVietnamPro(fontSize: 11.5, color: const Color(0xFFDC2626)),
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        ),
      ],
    );
  }
}
