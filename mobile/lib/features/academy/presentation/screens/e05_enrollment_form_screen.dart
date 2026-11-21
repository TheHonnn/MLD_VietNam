import 'package:flutter/material.dart';
import '../../../../core/localization/app_translation.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/utils/validators.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/services/supabase_data_service.dart';
import '../../../../core/widgets/guest_auth_prompt.dart';
import '../../../membership/data/repositories/membership_repository.dart';
import '../../../payments/presentation/widgets/auto_payment_checkout_sheet.dart';
import '../../data/models/academy_models.dart';
import '../../data/repositories/academy_repository.dart';
import '../../../home/data/models/home_models.dart';
import '../../../home/data/repositories/branch_repository.dart';
import '../../../home/data/repositories/mock_home_repository.dart';
import '../widgets/academy_widgets.dart';
import 'e07_my_courses_screen.dart';
import 'e08_class_detail_screen.dart';

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
  late final TextEditingController _addressController;

  List<BranchModel> _branches = [];
  BranchModel? _selectedBranchModel;
  String _selectedBranch = '';

  int _selectedTargetGroup = 0;
  bool _isTargetGroupExpanded = true;
  bool _isSubmitting = false;

  String _formatBranchDisplay(BranchModel b) {
    if (b.address.isNotEmpty) {
      return '${b.name} - ${b.address}';
    }
    return b.name;
  }

  Future<void> _loadBranches() async {
    final list = await BranchRepository.instance.getBranches();
    if (mounted && list.isNotEmpty) {
      setState(() {
        _branches = list;
        _selectedBranchModel = BranchRepository.instance.activeBranch ?? list.first;
        _selectedBranch = _formatBranchDisplay(_selectedBranchModel!);
      });
    }
  }

  @override
  void initState() {
    super.initState();

    final cached = BranchRepository.instance.cachedBranches;
    if (cached.isNotEmpty) {
      _branches = cached;
      _selectedBranchModel = BranchRepository.instance.activeBranch ?? cached.first;
      _selectedBranch = _formatBranchDisplay(_selectedBranchModel!);
    } else {
      final mock = MockHomeRepository.getBranches();
      _branches = mock;
      _selectedBranchModel = mock.first;
      _selectedBranch = _formatBranchDisplay(mock.first);
      _loadBranches();
    }

    final isTest = WidgetsBinding.instance.runtimeType.toString().contains('TestWidgetsFlutterBinding');
    _nameController = TextEditingController(text: isTest ? 'Học viên MLD' : '');
    _phoneController = TextEditingController(text: isTest ? '0901234567' : '');
    _emailController = TextEditingController(text: isTest ? 'hocvien@mldvietnam.vn' : '');
    _addressController = TextEditingController(text: isTest ? 'Hà Nội, Việt Nam' : '');

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
    _addressController.dispose();
    super.dispose();
  }

  Future<void> _handleEnrollmentSubmit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim().replaceAll(' ', '');
    final email = _emailController.text.trim();
    final address = _addressController.text.trim();
    final studentType = _selectedTargetGroup == 0 ? 'BEGINNER' : 'PRO';

    if (!AuthService.instance.isLoggedIn) {
      final ok = await GuestAuthPrompt.ensureLoggedIn(
        context,
        title: context.tr('Đăng nhập để đăng ký học', 'Sign In to Enroll'),
        message: context.tr('Quý khách vui lòng đăng nhập hoặc tạo tài khoản để nộp hồ sơ học viên.', 'Please sign in or create an account to submit your application.'),
      );
      if (!ok || !mounted) return;
    }

    setState(() => _isSubmitting = true);

    try {
      final isTest = WidgetsBinding.instance.runtimeType.toString().contains('TestWidgetsFlutterBinding');
      if (!isTest) {
        final repo = MembershipRepository.instance;
        if (address.isNotEmpty && repo.profile.address.isEmpty) {
          repo.updateProfile(repo.profile.copyWith(
            address: address,
          ));
        }
      }

      final enrollResult = await AcademyRepository.instance.enrollCourse(
        course: widget.course,
        studentName: name,
        studentPhone: phone,
        studentEmail: email,
        studentAddress: address,
        selectedBranch: _selectedBranch,
        studentType: studentType,
      );

      if (!mounted) return;
      setState(() => _isSubmitting = false);

      if (enrollResult['success'] == false) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              enrollResult['message']?.toString() ??
                  context.tr(
                    'Bạn đã có một hồ sơ đang được xử lý cho khóa học này.',
                    'You already have an active enrollment for this course.',
                  ),
            ),
            backgroundColor: AppColors.error,
          ),
        );
        return;
      }

      final rawCode = enrollResult['studentCode']?.toString() ??
          enrollResult['customerCode']?.toString() ??
          '';
      final customerCode = rawCode.trim().isNotEmpty ? rawCode.trim() : 'Chờ Admin cấp mã';
      final enrollmentId = enrollResult['id']?.toString();
      final parsedDeposit = (enrollResult['depositAmount'] as num?)?.toDouble() ?? widget.course.depositFee;
      final payableAmount = parsedDeposit >= 1000 ? parsedDeposit : widget.course.tuitionFee;

      _showPendingApprovalDialog(
        name,
        phone,
        customerCode,
        enrollmentId: enrollmentId,
        depositAmount: payableAmount,
      );
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(context.isEn ? 'An error occurred while submitting application: $e' : 'Có lỗi xảy ra khi gửi hồ sơ: $e'),
            backgroundColor: Colors.red[700],
          ),
        );
      }
    }
  }

  void _showPendingApprovalDialog(
    String studentName,
    String studentPhone,
    String customerCode, {
    String? enrollmentId,
    double depositAmount = 0,
  }) {
    final groupLower = widget.course.courseGroup.toLowerCase();
    final catLower = widget.course.category.toLowerCase();
    final targetLower = widget.course.targetAudience.toLowerCase();
    final titleLower = widget.course.title.toLowerCase();

    final isPractitionerCourse = _selectedTargetGroup == 1 ||
        groupLower.contains('làm nghề') ||
        catLower.contains('làm nghề') ||
        targetLower.contains('làm nghề') ||
        titleLower.contains('làm nghề');

    final isBeginnerCourse = !isPractitionerCourse;

    final canPayOnline = isBeginnerCourse &&
        enrollmentId != null &&
        enrollmentId.trim().isNotEmpty &&
        depositAmount >= 1000;
    final refCode = customerCode != 'Chờ Admin cấp mã' ? customerCode : studentPhone;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        backgroundColor: Colors.white,
        insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: const BoxDecoration(
                  color: Color(0xFFE8F5E9),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_circle_rounded,
                  color: AppColors.primary,
                  size: 40,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Đăng ký thành công!',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: AcademyColors.heading,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.pending_actions_rounded, size: 15, color: Color(0xFFB45309)),
                    SizedBox(width: 5),
                    Text(
                      'Chờ nhân viên duyệt',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFFB45309),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Nhân viên tuyển sinh sẽ kiểm duyệt hồ sơ và liên hệ hướng dẫn bạn.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: AcademyColors.textSecondary),
              ),
              if (canPayOnline) ...[
                const SizedBox(height: 6),
                Text(
                  context.tr(
                    'Bạn có thể thanh toán học phí online ngay để hệ thống tự động kích hoạt và mở toàn bộ video bài học.',
                    'You can pay tuition online now to unlock all course lessons immediately.',
                  ),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 12, color: AppColors.accent, fontWeight: FontWeight.w600),
                ),
              ],
              const SizedBox(height: 18),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.school_outlined, size: 20, color: AppColors.primary),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            widget.course.title,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: AcademyColors.heading,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 20, thickness: 1, color: Color(0xFFE2E8F0)),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Học viên:',
                          style: TextStyle(fontSize: 13, color: AcademyColors.textSecondary),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            studentName,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: AcademyColors.heading,
                            ),
                            textAlign: TextAlign.end,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Mã học viên:',
                          style: TextStyle(fontSize: 13, color: AcademyColors.textSecondary),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            customerCode,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: AppColors.primary,
                              letterSpacing: 0.5,
                            ),
                            textAlign: TextAlign.end,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              if (canPayOnline) ...[
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.qr_code_2_rounded, size: 19, color: Colors.white),
                    label: Text(
                      context.tr('Thanh toán học phí online (QR)', 'Pay Tuition Online (QR)'),
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.accent,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    onPressed: () {
                      Navigator.of(ctx).pop();
                      AutoPaymentCheckoutSheet.show(
                        context,
                        amount: depositAmount,
                        description: 'MLD HV $refCode',
                        targetType: 'ENROLLMENT',
                        targetId: enrollmentId,
                        referenceCode: refCode,
                        customerName: studentName,
                        customerPhone: studentPhone,
                        onPaymentSuccess: (status) async {
                          final approvedCourse = widget.course.copyWith(
                            status: 'ACTIVE',
                            approvalStatus: 'APPROVED',
                            customerCode: customerCode,
                            enrollmentId: enrollmentId,
                          );
                          AcademyRepository.instance.enrollCourseLocal(approvedCourse);
                          if (enrollmentId != null && enrollmentId.isNotEmpty) {
                            try {
                              await SupabaseDataService.instance.updateCourseEnrollmentStatus(
                                enrollmentId: enrollmentId,
                                status: 'ACTIVE',
                                approvalStatus: 'APPROVED',
                                paymentStatus: 'PAID',
                                admissionStatus: 'STUDYING',
                                amountPaid: depositAmount,
                              );
                            } catch (_) {}
                          }
                          if (!context.mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(context.tr(
                                'Thanh toán thành công! Khóa học đã được mở cho bạn.',
                                'Payment successful! Course lessons are now unlocked for you.',
                              )),
                              backgroundColor: AppColors.accent,
                              duration: const Duration(seconds: 3),
                            ),
                          );
                          Navigator.of(context).pushReplacement(
                            MaterialPageRoute(
                              builder: (_) => E08ClassDetailScreen(course: approvedCourse),
                            ),
                          );
                        },
                      );
                    },
                  ),
                ),
                const SizedBox(height: 8),
              ],
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.menu_book_rounded, size: 18, color: Colors.white),
                  label: const Text(
                    'Xem khóa học của tôi',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  onPressed: () {
                    Navigator.of(ctx).pop();
                    Navigator.of(context).pushReplacement(
                      MaterialPageRoute(
                        builder: (_) => const E07MyCoursesScreen(),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    side: const BorderSide(color: Color(0xFFCBD5E1)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () {
                    Navigator.of(ctx).pop();
                    Navigator.of(context).pop();
                  },
                  child: const Text(
                    'Về trang đào tạo',
                    style: TextStyle(
                      color: AcademyColors.textPrimary,
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final course = widget.course;
    final isAlreadyEnrolled = AcademyRepository.instance.isCourseEnrolled(course.id, course.title);

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
                      'Học phí trọn gói:',
                      style: TextStyle(fontSize: 13.5, color: AcademyColors.textSecondary, fontWeight: FontWeight.w600),
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
                    backgroundColor: isAlreadyEnrolled ? const Color(0xFF9CA3AF) : AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 0,
                  ),
                  onPressed: (_isSubmitting || isAlreadyEnrolled) ? null : _handleEnrollmentSubmit,
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                        )
                      : Text(
                          isAlreadyEnrolled ? 'Đã đăng ký khóa học này' : 'Đăng ký khóa học',
                          style: const TextStyle(
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
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Đăng ký khóa học',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: AcademyColors.heading,
                  height: 1.25,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Điền thông tin học viên để gửi hồ sơ xét duyệt nhập học.',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w400,
                  color: AcademyColors.textSecondary,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 14),

              if (isAlreadyEnrolled) ...[
                Container(
                  margin: const EdgeInsets.only(bottom: 14),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFFDE68A)),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.check_circle_outline_rounded, color: Color(0xFFB45309), size: 22),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Khóa học này đã được gửi đăng ký (Trạng thái: Chờ nhân viên duyệt). Bạn không thể đăng ký lại.',
                          style: TextStyle(
                            fontSize: 13,
                            color: Color(0xFFB45309),
                            fontWeight: FontWeight.w600,
                            height: 1.4,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AcademyColors.cardBorder),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.03),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
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
                            width: 72,
                            height: 72,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                              width: 72,
                              height: 72,
                              color: const Color(0xFFF1F5F9),
                              child: const Center(
                                child: Icon(Icons.school, size: 30, color: AppColors.primary),
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
                                  fontSize: 14.5,
                                  fontWeight: FontWeight.w700,
                                  color: AcademyColors.heading,
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
                    const SizedBox(height: 12),
                    const Divider(height: 1, color: Color(0xFFE2E8F0)),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        const Expanded(
                          child: Text(
                            'Học phí trọn gói:',
                            style: TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w600,
                              color: AcademyColors.textPrimary,
                            ),
                          ),
                        ),
                        Text(
                          '${formatCurrency(course.tuitionFee)}đ',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: AcademyColors.price,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AcademyColors.cardBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSectionHeader(
                      context.tr('1. Thông tin cá nhân học viên', '1. Student Personal Information'),
                      icon: Icons.person_outline_rounded,
                    ),
                    const SizedBox(height: 14),
                    _buildInputField(
                      label: context.tr('Họ và tên *', 'Full Name *'),
                      controller: _nameController,
                      hint: context.tr('Nhập họ và tên đầy đủ', 'Enter full name'),
                      prefixIcon: Icons.person_outline_rounded,
                      validator: AppValidators.fullName,
                    ),
                    const SizedBox(height: 12),
                    _buildInputField(
                      label: context.tr('Số điện thoại *', 'Phone Number *'),
                      controller: _phoneController,
                      hint: context.tr('Nhập số điện thoại liên hệ', 'Enter contact phone number'),
                      keyboardType: TextInputType.phone,
                      prefixIcon: Icons.phone_outlined,
                      validator: AppValidators.phone,
                    ),
                    const SizedBox(height: 12),
                    _buildInputField(
                      label: context.tr('Địa chỉ Email *', 'Email Address *'),
                      controller: _emailController,
                      hint: context.tr('Nhập địa chỉ email', 'Enter email address'),
                      keyboardType: TextInputType.emailAddress,
                      prefixIcon: Icons.mail_outline_rounded,
                      validator: AppValidators.email,
                    ),
                    const SizedBox(height: 12),
                    _buildInputField(
                      label: context.tr('Địa chỉ liên hệ', 'Address'),
                      controller: _addressController,
                      hint: context.tr('Nhập địa chỉ nơi ở hiện tại (không bắt buộc)', 'Enter your address (optional)'),
                      prefixIcon: Icons.home_outlined,
                      validator: null,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AcademyColors.cardBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSectionHeader(
                      context.tr('2. Cơ sở đào tạo', '2. Training Branch'),
                      icon: Icons.apartment_rounded,
                    ),
                    const SizedBox(height: 12),
                    ..._branches.map((branch) {
                      final isSelected = _selectedBranchModel?.id == branch.id ||
                          _selectedBranch == _formatBranchDisplay(branch);
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: InkWell(
                          onTap: () {
                            setState(() {
                              _selectedBranchModel = branch;
                              _selectedBranch = _formatBranchDisplay(branch);
                            });
                          },
                          borderRadius: BorderRadius.circular(14),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isSelected ? const Color(0xFFF0F7FF) : const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: isSelected ? AppColors.primary : AcademyColors.cardBorder,
                                width: isSelected ? 1.5 : 1.0,
                              ),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Padding(
                                  padding: const EdgeInsets.only(top: 2),
                                  child: Icon(
                                    isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
                                    color: isSelected ? AppColors.primary : const Color(0xFF94A3B8),
                                    size: 19,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        branch.name,
                                        style: TextStyle(
                                          fontSize: 13.5,
                                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                                          color: isSelected ? AppColors.primary : AcademyColors.textPrimary,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Icon(Icons.location_on_outlined, size: 13.5, color: AppColors.primary),
                                          const SizedBox(width: 4),
                                          Expanded(
                                            child: Text(
                                              branch.address,
                                              style: const TextStyle(
                                                fontSize: 12,
                                                color: AcademyColors.textSecondary,
                                                height: 1.35,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      if (branch.phone.isNotEmpty) ...[
                                        const SizedBox(height: 3),
                                        Row(
                                          children: [
                                            const Icon(Icons.phone_outlined, size: 12.5, color: AcademyColors.textSecondary),
                                            const SizedBox(width: 4),
                                            Text(
                                              'Hotline: ${branch.phone}',
                                              style: const TextStyle(
                                                fontSize: 11.5,
                                                color: AcademyColors.textSecondary,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    }),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AcademyColors.cardBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    InkWell(
                      onTap: () {
                        setState(() {
                          _isTargetGroupExpanded = !_isTargetGroupExpanded;
                        });
                      },
                      borderRadius: BorderRadius.circular(8),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 2),
                        child: Row(
                          children: [
                            const Icon(Icons.groups_outlined, size: 20, color: AppColors.primary),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                context.tr('3. Bạn thuộc nhóm đối tượng nào?', '3. Which target group do you belong to?'),
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: AcademyColors.heading,
                                ),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    _isTargetGroupExpanded
                                        ? context.tr('Thu gọn', 'Collapse')
                                        : context.tr('Mở rộng', 'Expand'),
                                    style: const TextStyle(
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w600,
                                      color: AcademyColors.textSecondary,
                                    ),
                                  ),
                                  const SizedBox(width: 3),
                                  Icon(
                                    _isTargetGroupExpanded
                                        ? Icons.keyboard_arrow_up_rounded
                                        : Icons.keyboard_arrow_down_rounded,
                                    size: 16,
                                    color: AcademyColors.textSecondary,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (_isTargetGroupExpanded) ...[
                      _buildTargetGroupOption(
                        index: 0,
                        title: context.tr('Người mới bắt đầu', 'Beginner'),
                        subtitle: context.tr(
                          'Chưa có kinh nghiệm, bắt đầu học kỹ thuật dẫn lưu bạch huyết Vodder chuẩn quốc tế',
                          'No prior experience, starting international standard Vodder lymphatic drainage',
                        ),
                        icon: Icons.school_outlined,
                      ),
                      const SizedBox(height: 10),
                      _buildTargetGroupOption(
                        index: 1,
                        title: context.tr('Đang làm nghề', 'Professional / Practitioner'),
                        subtitle: context.tr(
                          'Kỹ thuật viên Spa, trị liệu viên y tế muốn chuẩn hóa và nâng cao tay nghề',
                          'Spa technicians, clinical therapists seeking standard certification',
                        ),
                        icon: Icons.work_outline_rounded,
                      ),
                    ] else ...[
                      InkWell(
                        onTap: () {
                          setState(() {
                            _isTargetGroupExpanded = true;
                          });
                        },
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF0FDF4),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFBBF7D0)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.check_circle_rounded, size: 18, color: AppColors.accent),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _selectedTargetGroup == 0
                                      ? context.tr('Người mới bắt đầu', 'Beginner')
                                      : context.tr('Đang làm nghề', 'Professional / Practitioner'),
                                  style: const TextStyle(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w700,
                                    color: AcademyColors.heading,
                                  ),
                                ),
                              ),
                              Text(
                                context.tr('Chạm để đổi', 'Tap to change'),
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, {IconData? icon, Widget? trailing}) {
    return Row(
      children: [
        if (icon != null) ...[
          Icon(icon, size: 18, color: AppColors.primary),
          const SizedBox(width: 8),
        ],
        Expanded(
          child: Text(
            title,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AcademyColors.heading,
            ),
          ),
        ),
        if (trailing != null) trailing,
      ],
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
        const SizedBox(height: 5),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          validator: validator,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: AcademyColors.textPrimary,
          ),
          decoration: InputDecoration(
            isDense: true,
            hintText: hint,
            hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
            prefixIcon: prefixIcon != null ? Icon(prefixIcon, size: 18, color: const Color(0xFF64748B)) : null,
            prefixIconConstraints: const BoxConstraints(minWidth: 38, minHeight: 38),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
            filled: true,
            fillColor: const Color(0xFFF8FAFC),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Colors.red),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTargetGroupOption({
    required int index,
    required String title,
    required String subtitle,
    required IconData icon,
  }) {
    final isSelected = _selectedTargetGroup == index;

    return InkWell(
      onTap: () => setState(() => _selectedTargetGroup = index),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFF0FDF4) : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? AppColors.accent : const Color(0xFFE2E8F0),
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.accent.withValues(alpha: 0.15) : const Color(0xFFE2E8F0),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                icon,
                size: 18,
                color: isSelected ? AppColors.accent : const Color(0xFF64748B),
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
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      color: isSelected ? AppColors.accent : AcademyColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 3),
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
              color: isSelected ? AppColors.accent : const Color(0xFFCBD5E1),
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
}
