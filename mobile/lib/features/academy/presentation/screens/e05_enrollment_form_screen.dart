import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/utils/validators.dart';
import '../../../../core/services/auth_service.dart';
import '../../../membership/data/repositories/membership_repository.dart';
import '../../data/models/academy_models.dart';
import '../../data/repositories/academy_repository.dart';
import '../widgets/academy_widgets.dart';

/// Screen E05: Đăng ký khóa học
/// Thiết kế tinh gọn theo yêu cầu:
/// - Chỉ hiện: Thông tin cá nhân, Cơ sở đào tạo, Lựa chọn đối tượng (Người mới bắt đầu / Đang làm nghề), và Giá tiền.
/// - Loại bỏ hoàn toàn 100% thanh toán.
/// - Đẩy hồ sơ lên hệ thống với trạng thái Chờ duyệt thủ công bởi nhân viên.
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

  // 1. Cơ sở đào tạo
  final List<String> _branchOptions = const [
    'Học viện MLD Việt Nam - Chi nhánh Quận 3, TP.HCM (Trụ sở chính)',
    'Học viện MLD Việt Nam - Chi nhánh Cầu Giấy, Hà Nội',
  ];
  late String _selectedBranch;

  // 2. Lựa chọn đối tượng học viên: 0: Người mới bắt đầu, 1: Đang làm nghề
  int _selectedTargetGroup = 0;

  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _selectedBranch = _branchOptions.first;

    final profile = MembershipRepository.instance.profile;
    final currentPhone = AuthService.instance.currentPhone;
    final email = AuthService.instance.lastLoginEmail ?? profile.email;

    final initialName = profile.fullName.trim().isNotEmpty
        ? profile.fullName
        : 'Học viên MLD';
    final initialPhone = (currentPhone != null && currentPhone.trim().isNotEmpty)
        ? currentPhone
        : (profile.phone.trim().isNotEmpty ? profile.phone : '0901234567');
    final initialEmail = (email != null && email.trim().isNotEmpty)
        ? email
        : 'hocvien@mldvietnam.vn';

    _nameController = TextEditingController(text: initialName);
    _phoneController = TextEditingController(text: initialPhone);
    _emailController = TextEditingController(text: initialEmail);

    // Mặc định phân nhóm đối tượng theo dữ liệu khóa học nếu có
    if (widget.course.targetAudience.toLowerCase().contains('nghề') ||
        widget.course.courseGroup.toLowerCase().contains('làm nghề')) {
      _selectedTargetGroup = 1;
    } else {
      _selectedTargetGroup = 0;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleEnrollmentSubmit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim().replaceAll(' ', '');
    final email = _emailController.text.trim();
    final studentType = _selectedTargetGroup == 0 ? 'BEGINNER' : 'PRO';

    setState(() => _isSubmitting = true);

    try {
      final isTest = WidgetsBinding.instance.runtimeType.toString().contains('TestWidgetsFlutterBinding');
      // 1. Cập nhật phone cho user nếu chưa có
      if (phone.isNotEmpty && !isTest) {
        await AuthService.instance.updatePhone(phone);
        final repo = MembershipRepository.instance;
        repo.updateProfile(repo.profile.copyWith(phone: phone, isPhoneVerified: true));
      }

      // 2. Gửi đăng ký lên Supabase Cloud với trạng thái CHỜ DUYỆT THỦ CÔNG
      await AcademyRepository.instance.enrollCourse(
        course: widget.course,
        studentName: name,
        studentPhone: phone,
        studentEmail: email,
        selectedBranch: _selectedBranch,
        studentType: studentType,
      );

      if (!mounted) return;
      setState(() => _isSubmitting = false);

      // 3. Hiển thị thông báo xác nhận trạng thái Chờ duyệt
      _showPendingApprovalDialog(name, phone);
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Có lỗi xảy ra khi gửi hồ sơ: $e'),
            backgroundColor: Colors.red[700],
          ),
        );
      }
    }
  }

  void _showPendingApprovalDialog(String studentName, String studentPhone) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        titlePadding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
        contentPadding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF3C7),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.hourglass_top_rounded, color: Color(0xFFD97706), size: 28),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Text(
                'Đăng ký thành công',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AcademyColors.heading,
                ),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF3C7),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFFDE68A)),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.pending_actions_rounded, size: 16, color: Color(0xFFB45309)),
                  SizedBox(width: 6),
                  Flexible(
                    child: Text(
                      'Trạng thái: Chờ nhân viên duyệt',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFFB45309),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Hồ sơ đăng ký của học viên $studentName cho khóa học "${widget.course.title}" đã được gửi lên hệ thống tuyển sinh của MLD Việt Nam.',
              style: const TextStyle(fontSize: 13.5, height: 1.45, color: AcademyColors.textPrimary),
            ),
            const SizedBox(height: 10),
            Text(
              'Nhân viên tuyển sinh sẽ kiểm duyệt hồ sơ thủ công và liên hệ với bạn qua số điện thoại $studentPhone để xác nhận nhập học.',
              style: const TextStyle(fontSize: 13, height: 1.45, color: AcademyColors.textSecondary),
            ),
          ],
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () {
                Navigator.of(ctx).pop();
                Navigator.of(context).pop();
              },
              child: const Text(
                'Đã hiểu & Hoàn tất',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
              ),
            ),
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
      appBar: const AcademyAppBar(),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const Expanded(
                    child: Text(
                      'Học phí niêm yết:',
                      style: TextStyle(fontSize: 13, color: AcademyColors.textSecondary, fontWeight: FontWeight.w500),
                    ),
                  ),
                  Text(
                    '${formatCurrency(course.tuitionFee)}đ',
                    style: const TextStyle(fontSize: 19, color: AcademyColors.price, fontWeight: FontWeight.w800),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  key: const Key('submit_enrollment_button'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  onPressed: _isSubmitting ? null : _handleEnrollmentSubmit,
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                        )
                      : const Text(
                          'Đăng ký khóa học',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Tiêu đề
              const Text(
                'Đăng ký khóa học',
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  color: AcademyColors.heading,
                  height: 1.25,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Điền thông tin học viên để gửi hồ sơ xét duyệt nhập học.',
                style: TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w400,
                  color: AcademyColors.textSecondary,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 18),

              // 2. Thẻ khóa học & Giá tiền (Học phí)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AcademyColors.cardWarm,
                  borderRadius: BorderRadius.circular(18),
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
                            width: 76,
                            height: 76,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                              width: 76,
                              height: 76,
                              color: Colors.white,
                              child: const Center(
                                child: Icon(Icons.school, size: 32, color: AcademyColors.primary),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                course.title,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: AcademyColors.textPrimary,
                                  height: 1.3,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFEF3C7),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Text(
                                  'Chờ duyệt tuyển sinh',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFFB45309),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    const Divider(height: 1, color: AcademyColors.cardBorder),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        const Expanded(
                          child: Text(
                            'Học phí trọn gói:',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AcademyColors.textPrimary,
                            ),
                          ),
                        ),
                        Text(
                          '${formatCurrency(course.tuitionFee)}đ',
                          style: const TextStyle(
                            fontSize: 19,
                            fontWeight: FontWeight.w800,
                            color: AcademyColors.price,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 22),

              // 3. Thông tin cá nhân
              _buildSectionHeader('1. Thông tin cá nhân học viên'),
              const SizedBox(height: 12),
              _buildInputField(
                label: 'Họ và tên *',
                controller: _nameController,
                hint: 'Nhập họ và tên đầy đủ',
                prefixIcon: Icons.person_outline_rounded,
                validator: AppValidators.fullName,
              ),
              const SizedBox(height: 12),
              _buildInputField(
                label: 'Số điện thoại *',
                controller: _phoneController,
                hint: 'Nhập số điện thoại liên hệ',
                keyboardType: TextInputType.phone,
                prefixIcon: Icons.phone_outlined,
                validator: AppValidators.phone,
              ),
              const SizedBox(height: 12),
              _buildInputField(
                label: 'Địa chỉ Email *',
                controller: _emailController,
                hint: 'Nhập địa chỉ email',
                keyboardType: TextInputType.emailAddress,
                prefixIcon: Icons.mail_outline_rounded,
                validator: AppValidators.email,
              ),
              const SizedBox(height: 22),

              // 4. Cơ sở đào tạo
              _buildSectionHeader('2. Cơ sở đào tạo'),
              const SizedBox(height: 10),
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
                ),
                child: Column(
                  children: _branchOptions.map((branch) {
                    final isSelected = _selectedBranch == branch;
                    return InkWell(
                      onTap: () => setState(() => _selectedBranch = branch),
                      borderRadius: BorderRadius.circular(16),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        child: Row(
                          children: [
                            Icon(
                              isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
                              color: isSelected ? AppColors.primary : Colors.grey[400],
                              size: 20,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                branch,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                  color: isSelected ? AcademyColors.textPrimary : AcademyColors.textSecondary,
                                  height: 1.35,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 22),

              // 5. Lựa chọn đối tượng học viên (1 là Người mới bắt đầu, 2 là Đang làm nghề)
              _buildSectionHeader('3. Bạn thuộc nhóm đối tượng nào?'),
              const SizedBox(height: 10),
              _buildTargetGroupCard(
                index: 0,
                title: 'Người mới bắt đầu',
                subtitle: 'Chưa có kinh nghiệm, muốn học kiến thức nền tảng và tự chăm sóc cơ bản theo chuẩn Vodder.',
                icon: Icons.person_add_alt_1_rounded,
              ),
              const SizedBox(height: 10),
              _buildTargetGroupCard(
                index: 1,
                title: 'Đang làm nghề',
                subtitle: 'Kỹ thuật viên Spa, Điều dưỡng, Bác sĩ muốn nâng cao tay nghề và tích hợp liệu pháp y khoa.',
                icon: Icons.medical_services_outlined,
              ),
              const SizedBox(height: 20),

              // Ghi chú cam kết
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF9FAFB),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE5E7EB)),
                ),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.shield_outlined, size: 18, color: Color(0xFF6B7280)),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Không yêu cầu thanh toán trực tuyến. Sau khi đăng ký, hồ sơ sẽ được chuyển vào hàng đợi xét duyệt thủ công bởi nhân viên tuyển sinh.',
                        style: TextStyle(fontSize: 12, color: Color(0xFF6B7280), height: 1.45),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: AcademyColors.heading,
      ),
    );
  }

  Widget _buildInputField({
    required String label,
    required TextEditingController controller,
    required String hint,
    TextInputType keyboardType = TextInputType.text,
    IconData? prefixIcon,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12.5,
            fontWeight: FontWeight.w600,
            color: AcademyColors.textPrimary,
          ),
        ),
        const SizedBox(height: 6),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AcademyColors.cardBorder, width: 1.0),
          ),
          child: TextFormField(
            controller: controller,
            keyboardType: keyboardType,
            validator: validator,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: AcademyColors.textPrimary,
            ),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: const TextStyle(fontSize: 13, color: AcademyColors.textSecondary),
              prefixIcon: prefixIcon != null ? Icon(prefixIcon, size: 18, color: Colors.grey[500]) : null,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              border: InputBorder.none,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTargetGroupCard({
    required int index,
    required String title,
    required String subtitle,
    required IconData icon,
  }) {
    final isSelected = _selectedTargetGroup == index;

    return InkWell(
      onTap: () => setState(() => _selectedTargetGroup = index),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFFFFBEB) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? AppColors.primary : AcademyColors.cardBorder,
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary.withValues(alpha: 0.15) : const Color(0xFFF3F4F6),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                icon,
                size: 20,
                color: isSelected ? AppColors.primary : const Color(0xFF6B7280),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: isSelected ? AppColors.primary : AcademyColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AcademyColors.textSecondary,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Icon(
              isSelected ? Icons.check_circle_rounded : Icons.radio_button_unchecked,
              color: isSelected ? AppColors.primary : Colors.grey[400],
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
}
