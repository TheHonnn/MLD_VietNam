import 'package:flutter/material.dart';
import '../../../../core/utils/validators.dart';
import '../../../../core/services/auth_service.dart';
import '../../data/models/booking_models.dart';
import '../widgets/group_c_widgets.dart';
import '../../../membership/data/repositories/membership_repository.dart';
import 'c06_booking_confirmation_screen.dart';

/// Screen C05: Thông tin đặt lịch [8111:27011]
class C05BookingInfoScreen extends StatefulWidget {
  final BookingFlowState flowState;

  const C05BookingInfoScreen({
    super.key,
    required this.flowState,
  });

  @override
  State<C05BookingInfoScreen> createState() => _C05BookingInfoScreenState();
}

class _C05BookingInfoScreenState extends State<C05BookingInfoScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _phoneController;
  late TextEditingController _emailController;
  late TextEditingController _specialRequestsController;
  late TextEditingController _accessibilityController;
  late TextEditingController _otherNotesController;

  late bool _isForSelf;
  late bool _isFirstTime;
  late bool _consentShareNeeds;

  @override
  void initState() {
    super.initState();
    _isForSelf = widget.flowState.isForSelf;
    _isFirstTime = widget.flowState.isFirstTime;
    _consentShareNeeds = widget.flowState.consentShareNeeds;

    final profile = MembershipRepository.instance.profile;
    _nameController = TextEditingController(
      text: widget.flowState.customerName.isNotEmpty
          ? widget.flowState.customerName
          : profile.fullName,
    );
    final currentPhone = AuthService.instance.currentPhone;
    final initialPhone = widget.flowState.customerPhone.isNotEmpty
        ? widget.flowState.customerPhone
        : ((currentPhone != null && currentPhone.isNotEmpty)
            ? currentPhone
            : profile.phone);
    _phoneController = TextEditingController(text: initialPhone);
    _emailController = TextEditingController(
      text: widget.flowState.customerEmail.isNotEmpty
          ? widget.flowState.customerEmail
          : profile.email,
    );
    _specialRequestsController = TextEditingController(text: widget.flowState.specialRequests);
    _accessibilityController = TextEditingController(text: widget.flowState.accessibilityNeeds);
    _otherNotesController = TextEditingController(text: widget.flowState.otherNotes);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _specialRequestsController.dispose();
    _accessibilityController.dispose();
    _otherNotesController.dispose();
    super.dispose();
  }

  Future<void> _onNext() async {
    if (_formKey.currentState?.validate() ?? false) {
      final phone = _phoneController.text.trim().replaceAll(' ', '');
      widget.flowState.isForSelf = _isForSelf;
      widget.flowState.customerName = _nameController.text.trim();
      widget.flowState.customerPhone = phone;
      widget.flowState.customerEmail = _emailController.text.trim();
      widget.flowState.specialRequests = _specialRequestsController.text.trim();
      widget.flowState.isFirstTime = _isFirstTime;
      widget.flowState.accessibilityNeeds = _accessibilityController.text.trim();
      widget.flowState.otherNotes = _otherNotesController.text.trim();
      widget.flowState.consentShareNeeds = _consentShareNeeds;

      // Lưu lại số điện thoại cho khách hàng vào AuthService và Backend nếu có cập nhật
      if (phone.isNotEmpty) {
        await AuthService.instance.updatePhone(phone);
        final repo = MembershipRepository.instance;
        repo.updateProfile(repo.profile.copyWith(phone: phone, isPhoneVerified: true));
      }

      if (mounted) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => C06BookingConfirmationScreen(flowState: widget.flowState),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: BookingColors.background,
      appBar: const BookingAppBar(),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: Form(
                key: _formKey,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                  children: [
                    const SizedBox(height: 8),
                    const BookingHeaderSection(
                      title: 'Thông tin đặt lịch',
                      subtitle: 'Vui lòng kiểm tra và bổ sung thông tin người sử dụng dịch vụ.',
                      currentStep: 2,
                    ),
                    const SizedBox(height: 8),

                    // Thẻ Radio chọn người sử dụng (350x128, fill=white, r=20)
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: BookingColors.cardBorder, width: 1.0),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Column(
                        children: [
                          InkWell(
                            onTap: () => setState(() => _isForSelf = true),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                              child: Row(
                                children: [
                                  Container(
                                    width: 24,
                                    height: 24,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: _isForSelf ? BookingColors.primary : Colors.white,
                                      border: Border.all(
                                        color: BookingColors.primary,
                                        width: 1.5,
                                      ),
                                    ),
                                    child: _isForSelf
                                        ? const Icon(Icons.check, size: 14, color: Colors.white)
                                        : null,
                                  ),
                                  const SizedBox(width: 12),
                                  const Text(
                                    'Tôi sử dụng dịch vụ',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: BookingColors.textPrimary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const Divider(height: 1, color: BookingColors.cardBorder),
                          InkWell(
                            onTap: () => setState(() => _isForSelf = false),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                              child: Row(
                                children: [
                                  Container(
                                    width: 24,
                                    height: 24,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: !_isForSelf ? BookingColors.primary : Colors.white,
                                      border: Border.all(
                                        color: BookingColors.primary,
                                        width: 1.5,
                                      ),
                                    ),
                                    child: !_isForSelf
                                        ? const Icon(Icons.check, size: 14, color: Colors.white)
                                        : null,
                                  ),
                                  const SizedBox(width: 12),
                                  const Text(
                                    'Đặt cho người khác',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: BookingColors.textPrimary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Ô nhập: Họ và tên *
                    _buildInputField(
                      label: 'Họ và tên *',
                      controller: _nameController,
                      hint: 'Nhập họ và tên',
                      validator: AppValidators.fullName,
                    ),
                    const SizedBox(height: 12),

                    // Ô nhập: Số điện thoại *
                    _buildInputField(
                      label: 'Số điện thoại *',
                      controller: _phoneController,
                      hint: 'Nhập số điện thoại',
                      keyboardType: TextInputType.phone,
                      validator: AppValidators.phone,
                    ),
                    const SizedBox(height: 12),

                    // Ô nhập: Email (tùy chọn)
                    _buildInputField(
                      label: 'Email (tùy chọn)',
                      controller: _emailController,
                      hint: 'Nhập email liên hệ',
                      keyboardType: TextInputType.emailAddress,
                      validator: (val) => AppValidators.email(val, isOptional: true),
                    ),
                    const SizedBox(height: 24),

                    // Thẻ "Để buổi chăm sóc thoải mái hơn" (350x478, fill=white, r=20)
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: BookingColors.cardBorder, width: 1.0),
                      ),
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Để buổi chăm sóc thoải mái hơn',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w600,
                              color: BookingColors.heading,
                            ),
                          ),
                          const SizedBox(height: 14),

                          // Ô nhập: Yêu cầu đặc biệt (tùy chọn)
                          _buildInnerField(
                            label: 'Yêu cầu đặc biệt (tùy chọn)',
                            controller: _specialRequestsController,
                            hint: 'Ví dụ: dùng lực vừa phải, tập trung vai gáy',
                          ),
                          const SizedBox(height: 12),

                          // Checkbox: Đây là lần đầu tiên tôi đến trung tâm
                          InkWell(
                            onTap: () => setState(() => _isFirstTime = !_isFirstTime),
                            child: Row(
                              children: [
                                Container(
                                  width: 24,
                                  height: 24,
                                  decoration: BoxDecoration(
                                    color: _isFirstTime ? BookingColors.primary : Colors.white,
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: BookingColors.primary),
                                  ),
                                  child: _isFirstTime
                                      ? const Icon(Icons.check, size: 16, color: Colors.white)
                                      : null,
                                ),
                                const SizedBox(width: 12),
                                const Expanded(
                                  child: Text(
                                    'Đây là lần đầu tôi đến trung tâm',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: BookingColors.textPrimary,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 14),

                          // Ô nhập: Hỗ trợ tiếp cận (tùy chọn)
                          _buildInnerField(
                            label: 'Hỗ trợ tiếp cận (tùy chọn)',
                            controller: _accessibilityController,
                            hint: 'Ví dụ: hỗ trợ lối đi thang máy, người lớn tuổi',
                          ),
                          const SizedBox(height: 12),

                          // Ô nhập: Ghi chú khác (tùy chọn)
                          _buildInnerField(
                            label: 'Ghi chú khác (tùy chọn)',
                            controller: _otherNotesController,
                            hint: 'Thông tin bổ sung khác',
                          ),
                          const SizedBox(height: 10),

                          const Text(
                            'Chỉ chia sẻ nhu cầu phục vụ cần thiết; không nhập chẩn đoán hay hồ sơ y tế chi tiết. Thông tin tùy chọn dùng để chuẩn bị buổi chăm sóc.',
                            style: TextStyle(
                              fontSize: 12,
                              color: BookingColors.textPrimary,
                              height: 1.4,
                            ),
                          ),
                          const SizedBox(height: 12),

                          // Checkbox: Tôi đồng ý chia sẻ nhu cầu hỗ trợ...
                          InkWell(
                            onTap: () => setState(() => _consentShareNeeds = !_consentShareNeeds),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: 24,
                                  height: 24,
                                  decoration: BoxDecoration(
                                    color: _consentShareNeeds ? BookingColors.primary : Colors.white,
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: BookingColors.primary),
                                  ),
                                  child: _consentShareNeeds
                                      ? const Icon(Icons.check, size: 16, color: Colors.white)
                                      : null,
                                ),
                                const SizedBox(width: 12),
                                const Expanded(
                                  child: Text(
                                    'Tôi đồng ý chia sẻ nhu cầu hỗ trợ với người phụ trách buổi hẹn',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: BookingColors.textPrimary,
                                      height: 1.35,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // BookingSummaryCard / Mặc định (350x372)
                    BookingSummaryCardWidget(flowState: widget.flowState),
                    const SizedBox(height: 24),

                    // Thẻ Ghi chú
                    const IllustrationNoteCard(
                      text: 'Thông tin khách hàng được bảo mật và dùng để xác nhận lịch hẹn.',
                    ),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),

            // Fixed Bottom Bar
            BookingFixedBottomBar(
              buttonText: 'Kiểm tra đặt lịch',
              onPressed: _onNext,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInputField({
    required String label,
    required TextEditingController controller,
    required String hint,
    TextInputType keyboardType = TextInputType.text,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: BookingColors.textPrimary,
          ),
        ),
        const SizedBox(height: 6),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: BookingColors.cardBorder),
          ),
          child: TextFormField(
            controller: controller,
            keyboardType: keyboardType,
            validator: validator,
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: const TextStyle(fontSize: 14, color: BookingColors.textSecondary),
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              errorBorder: InputBorder.none,
              disabledBorder: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildInnerField({
    required String label,
    required TextEditingController controller,
    required String hint,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: BookingColors.textPrimary,
          ),
        ),
        const SizedBox(height: 6),
        Container(
          height: 52,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: BookingColors.cardBorder),
          ),
          child: TextField(
            controller: controller,
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: const TextStyle(fontSize: 13, color: BookingColors.textSecondary),
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              errorBorder: InputBorder.none,
              disabledBorder: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            ),
          ),
        ),
      ],
    );
  }
}
