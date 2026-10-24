import 'package:flutter/material.dart';
import '../../../../core/utils/validators.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/widgets/vietnamese_dob_picker.dart';
import '../../../membership/data/repositories/membership_repository.dart';
import '../../data/models/academy_models.dart';
import '../widgets/academy_widgets.dart';


/// Screen E05: Đăng ký khóa học [8116:25606]
/// Chuẩn 100% theo bản thiết kế gốc Figma từ khách hàng
class E05EnrollmentFormScreen extends StatefulWidget {
  final CourseModel course;

  const E05EnrollmentFormScreen({
    super.key,
    required this.course,
  });

  @override
  State<E05EnrollmentFormScreen> createState() => _E05EnrollmentFormScreenState();
}

class _E05EnrollmentFormScreenState extends State<E05EnrollmentFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _phoneController;
  late final TextEditingController _emailController;
  late final TextEditingController _dobController;
  late final TextEditingController _addressController;

  int _selectedExperience = 1; // 0: Chưa có, 1: Cơ bản / tự học (chuẩn Figma đang chọn), 2: Đang làm nghề
  String _selectedBranch = 'Chi nhánh Quận 3';
  String _selectedBatch = '23/10/2026 · MCN-1026';
  String _selectedFormat = 'Học trực tiếp';

  @override
  void initState() {
    super.initState();
    final profile = MembershipRepository.instance.profile;
    final currentPhone = AuthService.instance.currentPhone;
    final initialPhone = (currentPhone != null && currentPhone.isNotEmpty)
        ? currentPhone
        : profile.phone;
    _nameController = TextEditingController(text: profile.fullName);
    _phoneController = TextEditingController(text: initialPhone);
    _emailController = TextEditingController(text: profile.email);
    _dobController = TextEditingController(text: profile.dateOfBirth);
    _addressController = TextEditingController(text: profile.address);
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
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _dobController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  void _submitConsultation(String phone) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.check_circle, color: Color(0xFF236B42), size: 28),
            SizedBox(width: 10),
            Text('Đăng ký thành công', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ],
        ),
        content: const Text(
          'Yêu cầu tư vấn & giữ chỗ khóa học của bạn đã được ghi nhận thành công.\n\nĐội ngũ đào tạo MLD Vietnam sẽ liên hệ trực tiếp qua số điện thoại để tư vấn lộ trình và hướng dẫn thủ tục nhập học cho bạn.',
          style: TextStyle(fontSize: 14, height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              Navigator.of(context).pop();
            },
            child: const Text('Đồng ý', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final course = widget.course;

    return Scaffold(
      backgroundColor: AcademyColors.background,
      appBar: const AcademyAppBar(
        
      ),
      bottomNavigationBar: AcademyFixedBottomBar(
        summaryText: 'Tư vấn & Giữ chỗ miễn phí',
        buttonText: 'Xác nhận đăng ký tư vấn',
        onPressed: () async {
          if (_formKey.currentState?.validate() ?? false) {
            final phone = _phoneController.text.trim().replaceAll(' ', '');
            if (phone.isNotEmpty) {
              await AuthService.instance.updatePhone(phone);
              final repo = MembershipRepository.instance;
              repo.updateProfile(repo.profile.copyWith(phone: phone, isPhoneVerified: true));
            }
            if (context.mounted) {
              _submitConsultation(phone);
                // MaterialPageRoute(
                  // builder: (_) => E06TuitionPaymentScreen(
                    // course: course,
                    // studentName: _nameController.text.trim(),
                    // studentPhone: phone,
                    // studentEmail: _emailController.text.trim(),
                    // selectedBranch: _selectedBranch,
                    /* selectedShift: 'Thứ 6–7–Chủ nhật · 13:00–17:00',
                  ),
                ),
              // ); */
            }
          }
        },
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
            // 1. Tiêu đề trang [8116:25611]
            const Text(
              'Đăng ký khóa học',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
                height: 1.25,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Hoàn thiện thông tin để tham gia chương trình đào tạo.',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w400,
                color: AcademyColors.textSecondary,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 20),

            // 2. CourseCard / 07 (Thẻ khóa học nền vàng ấm chiếm phần lớn chuẩn Figma) [8116:25614]
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AcademyColors.cardWarm,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.asset(
                          course.image,
                          width: 80,
                          height: 96,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            width: 80,
                            height: 96,
                            color: Colors.white,
                            child: const Center(
                              child: Icon(Icons.school, size: 36, color: AcademyColors.primary),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              course.title,
                              style: const TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w700,
                                color: AcademyColors.textPrimary,
                                height: 1.3,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              '${course.durationWeeks} tuần · Học trực tiếp',
                              style: const TextStyle(
                                fontSize: 14,
                                color: AcademyColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Text(
                    '${formatCurrency(course.tuitionFee)}đ',
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: AcademyColors.primary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.6),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'Đăng ký mới · Chưa ghi danh',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AcademyColors.primary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // 3. Thông tin học viên (Chuẩn Figma: Tên đề mục là "Thông tin học viên") [8116:25624]
            const Text(
              'Thông tin học viên',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AcademyColors.heading,
              ),
            ),
            _buildInputField(
              'Họ và tên *',
              _nameController,
              'Nhập họ và tên học viên',
              validator: AppValidators.fullName,
            ),
            const SizedBox(height: 12),
            _buildInputField(
              'Số điện thoại *',
              _phoneController,
              'Nhập số điện thoại',
              keyboardType: TextInputType.phone,
              validator: AppValidators.phone,
            ),
            const SizedBox(height: 12),
            _buildInputField(
              'Email *',
              _emailController,
              'Nhập địa chỉ email',
              keyboardType: TextInputType.emailAddress,
              validator: AppValidators.email,
            ),
            const SizedBox(height: 12),
            _buildInputField(
              'Ngày sinh (tùy chọn)',
              _dobController,
              'Chọn ngày sinh (Năm / Tháng / Ngày)',
              readOnly: true,
              onTap: _pickDob,
              suffixIcon: const Icon(Icons.calendar_month_rounded, size: 18, color: AcademyColors.primary),
            ),
            const SizedBox(height: 12),
            _buildInputField('Địa chỉ liên hệ (tùy chọn)', _addressController, 'Số nhà, tên đường, phường/xã...'),
            const SizedBox(height: 24),

            // 4. Chọn lớp học [8116:25642]
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Chọn lớp học',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AcademyColors.heading,
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Cơ sở đào tạo
                  const Text(
                    'Cơ sở đào tạo',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AcademyColors.textPrimary),
                  ),
                  const SizedBox(height: 6),
                  _buildDropdownContainer(
                    value: _selectedBranch,
                    items: const ['Chi nhánh Quận 3', 'Chi nhánh mẫu 02 — Quận 1'],
                    onChanged: (val) => setState(() => _selectedBranch = val!),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    '123 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh',
                    style: TextStyle(fontSize: 12, color: AcademyColors.textSecondary),
                  ),
                  const SizedBox(height: 14),

                  // Đợt khai giảng
                  const Text(
                    'Đợt khai giảng',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AcademyColors.textPrimary),
                  ),
                  const SizedBox(height: 6),
                  _buildDropdownContainer(
                    value: _selectedBatch,
                    items: const ['23/10/2026 · MCN-1026', '20/11/2026 · MCN-1126'],
                    onChanged: (val) => setState(() => _selectedBatch = val!),
                  ),
                  const SizedBox(height: 14),

                  // Hình thức
                  const Text(
                    'Hình thức',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AcademyColors.textPrimary),
                  ),
                  const SizedBox(height: 6),
                  _buildDropdownContainer(
                    value: _selectedFormat,
                    items: const ['Học trực tiếp', 'Trực tuyến + Hội thảo'],
                    onChanged: (val) => setState(() => _selectedFormat = val!),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Thứ 6–7–Chủ nhật · 13:00–17:00',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AcademyColors.textPrimary),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Lớp học tiêu chuẩn từ 8-12 học viên/lớp để đảm bảo chất lượng.',
                    style: TextStyle(fontSize: 12, color: AcademyColors.textSecondary),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // 5. Kinh nghiệm đầu vào [8116:25660]
            const Text(
              'Bạn đã từng học hoặc làm việc trong lĩnh vực Spa chưa?',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AcademyColors.textPrimary,
                height: 1.35,
              ),
            ),
            const SizedBox(height: 12),
            _buildExperienceOption(
              index: 0,
              title: 'Chưa từng có kinh nghiệm',
              desc: 'Mới bắt đầu tìm hiểu và học nghề Spa.',
            ),
            const SizedBox(height: 10),
            _buildExperienceOption(
              index: 1,
              title: 'Đã có kinh nghiệm cơ bản / tự học',
              desc: 'Từng học hoặc thực hành một số kỹ thuật cơ bản.',
            ),
            const SizedBox(height: 10),
            _buildExperienceOption(
              index: 2,
              title: 'Đang làm việc tại Spa',
              desc: 'Muốn bổ sung kiến thức chuẩn y khoa và giấy chứng nhận.',
            ),
            const SizedBox(height: 24),

            // 6. Chi tiết học phí & Đặt cọc [8116:25674]
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Học phí',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AcademyColors.heading,
                    ),
                  ),
                  const SizedBox(height: 14),
                  _buildPriceRow('Học phí', '${formatCurrency(course.tuitionFee)}đ'),
                  const SizedBox(height: 8),
                  _buildPriceRow('Giảm giá', '0đ'),
                  const SizedBox(height: 8),
                  _buildPriceRow('Phí đăng ký', '0đ'),
                  const SizedBox(height: 12),
                  const Divider(color: AcademyColors.cardBorder, height: 1),
                  const SizedBox(height: 12),
                  _buildPriceRow(
                    'Tổng cộng',
                    '${formatCurrency(course.tuitionFee)}đ',
                    isTotal: true,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Thẻ cọc
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AcademyColors.cardWarm,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Thanh toán ngay: 2.000.000đ',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AcademyColors.primary,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Tiền cọc là một phần của tổng học phí 9.000.000đ, không cộng thêm vào tổng.',
                    style: TextStyle(
                      fontSize: 12,
                      color: AcademyColors.textPrimary,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Chú thích chân trang
            const Center(
              child: Text(
                'Vui lòng kiểm tra kỹ thông tin cá nhân và khóa học trước khi tiếp tục.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12,
                  color: AcademyColors.textSecondary,
                  height: 1.4,
                ),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

Widget _buildInputField(
  String label,
  TextEditingController controller,
  String hint, {
  TextInputType keyboardType = TextInputType.text,
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
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: AcademyColors.textPrimary,
        ),
      ),
      const SizedBox(height: 6),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
        ),
        child: TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          validator: validator,
          readOnly: readOnly,
          onTap: onTap,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: AcademyColors.textPrimary,
          ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(fontSize: 13, color: AcademyColors.textSecondary),
            suffixIcon: suffixIcon,
            border: InputBorder.none,
            errorStyle: const TextStyle(fontSize: 11),
            isDense: true,
            contentPadding: const EdgeInsets.symmetric(vertical: 14),
          ),
        ),
      ),
    ],
  );
}

  Widget _buildDropdownContainer({
    required String value,
    required List<String> items,
    required ValueChanged<String?> onChanged,
  }) {
    return Container(
      height: 52,
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: items.contains(value) ? value : items.first,
          isExpanded: true,
          icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF80766E), size: 20),
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AcademyColors.textPrimary),
          borderRadius: BorderRadius.circular(12),
          dropdownColor: Colors.white,
          items: items.map((i) => DropdownMenuItem(value: i, child: Text(i))).toList(),
          onChanged: onChanged,
        ),
      ),
    );
  }

  Widget _buildExperienceOption({
    required int index,
    required String title,
    required String desc,
  }) {
    final isSelected = _selectedExperience == index;
    return InkWell(
      onTap: () => setState(() => _selectedExperience = index),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? AcademyColors.cardWarm : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AcademyColors.primary : AcademyColors.cardBorder,
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: isSelected ? Colors.white : AcademyColors.cardWarm,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                index == 0
                    ? Icons.spa_outlined
                    : index == 1
                        ? Icons.school_outlined
                        : Icons.work_outline,
                color: AcademyColors.primary,
                size: 22,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: isSelected ? AcademyColors.primary : AcademyColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    desc,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AcademyColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPriceRow(String label, String value, {bool isTotal = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isTotal ? 15 : 13,
            fontWeight: isTotal ? FontWeight.w700 : FontWeight.w400,
            color: isTotal ? AcademyColors.textPrimary : AcademyColors.textSecondary,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: isTotal ? 18 : 14,
            fontWeight: isTotal ? FontWeight.w700 : FontWeight.w600,
            color: isTotal ? AcademyColors.primary : AcademyColors.textPrimary,
          ),
        ),
      ],
    );
  }
}
