import 'dart:async';
import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/services/auth_service.dart';
import '../../widgets/primary_button.dart';
import 'a05_profile_setup_screen.dart';

class A04OtpScreen extends StatefulWidget {
  final String phoneNumber;

  const A04OtpScreen({
    super.key,
    required this.phoneNumber,
  });

  @override
  State<A04OtpScreen> createState() => _A04OtpScreenState();
}

class _A04OtpScreenState extends State<A04OtpScreen> {
  final List<TextEditingController> _controllers =
      List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());
  int _countdown = 45;
  Timer? _timer;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _startCountdown();
  }

  @override
  void dispose() {
    _timer?.cancel();
    for (var c in _controllers) {
      c.dispose();
    }
    for (var f in _focusNodes) {
      f.dispose();
    }
    super.dispose();
  }

  void _startCountdown() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        if (_countdown > 0) {
          setState(() {
            _countdown--;
          });
        } else {
          timer.cancel();
        }
      }
    });
  }

  void _handleVerify() async {
    setState(() {
      _isLoading = true;
    });

    // Save session upon successful OTP verification
    final dummyToken = 'mld_token_${DateTime.now().millisecondsSinceEpoch}';
    await AuthService.instance.saveSession(
      accessToken: dummyToken,
      phone: widget.phoneNumber,
    );

    await Future.delayed(const Duration(milliseconds: 400));

    if (mounted) {
      setState(() {
        _isLoading = false;
      });
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => A05ProfileSetupScreen(phone: widget.phoneNumber),
        ),
      );
    }
  }

  String _formatMaskedPhone(String phone) {
    if (phone.isEmpty) return '+84 912 *** 678';
    String digits = phone.replaceAll(RegExp(r'\D'), '');
    if (digits.startsWith('84')) digits = '0${digits.substring(2)}';
    if (digits.length >= 9) {
      return '+84 ${digits.substring(1, 4)} *** ${digits.substring(digits.length - 3)}';
    }
    return '+84 912 *** 678';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background, // #F8F1E8
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: Padding(
                  padding: const EdgeInsets.only(
                    top: 12.0,
                    bottom: 16.0,
                    left: 20.0,
                    right: 20.0,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // --- PHẦN TRÊN: BackButton, Biểu tượng, Tiêu đề, 6 ô OTP, Nút gửi lại ---
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // 1. BackButton (44x44, r=12, border #E3D1BF, background white)
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

                          const SizedBox(height: 24),

                          // 2. Biểu tượng xác thực (64x64, r=20, background #F3E2CE, icon #985018)
                          Container(
                            width: 64,
                            height: 64,
                            decoration: BoxDecoration(
                              color: AppColors.surfaceSecondary, // #F3E2CE
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Center(
                              child: Icon(
                                Icons.smartphone_rounded,
                                size: 28,
                                color: AppColors.primary, // #985018
                              ),
                            ),
                          ),

                          const SizedBox(height: 16),

                          // 3. Tiêu đề và Mô tả
                          const Text(
                            'Xác thực số điện thoại',
                            style: TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w600,
                              height: 36.40 / 28,
                              color: AppColors.textHeading, // #693B20
                            ),
                          ),
                          const SizedBox(height: 10),
                          const Text(
                            'Nhập mã OTP đã được gửi đến số điện thoại của bạn.',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w400,
                              height: 23.25 / 15,
                              color: AppColors.textSecondary, // #6B6158
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            _formatMaskedPhone(widget.phoneNumber),
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              height: 24.80 / 16,
                              color: AppColors.textPrimary, // #40352F
                            ),
                          ),

                          const SizedBox(height: 28),

                          // 4. Hàng 6 ô nhập mã OTP (chiều cao 56, gap 8, r=12)
                          Row(
                            children: [
                              for (int index = 0; index < 6; index++) ...[
                                if (index > 0) const SizedBox(width: 8),
                                Expanded(
                                  child: Container(
                                    height: 56,
                                    decoration: BoxDecoration(
                                      color: AppColors.surface, // white
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: (_focusNodes[index].hasFocus || _controllers[index].text.isNotEmpty)
                                            ? AppColors.primary // #985018
                                            : AppColors.border, // #E3D1BF
                                        width: (_focusNodes[index].hasFocus || _controllers[index].text.isNotEmpty) ? 1.5 : 1.0,
                                      ),
                                    ),
                                    child: Center(
                                      child: TextField(
                                        controller: _controllers[index],
                                        focusNode: _focusNodes[index],
                                        keyboardType: TextInputType.number,
                                        textAlign: TextAlign.center,
                                        maxLength: 1,
                                        style: const TextStyle(
                                          fontSize: 22,
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.textHeading, // #693B20
                                        ),
                                        decoration: const InputDecoration(
                                          counterText: '',
                                          border: InputBorder.none,
                                          enabledBorder: InputBorder.none,
                                          focusedBorder: InputBorder.none,
                                          errorBorder: InputBorder.none,
                                          disabledBorder: InputBorder.none,
                                          contentPadding: EdgeInsets.zero,
                                          isDense: true,
                                        ),
                                        onChanged: (val) {
                                          if (val.isNotEmpty && index < 5) {
                                            _focusNodes[index + 1].requestFocus();
                                          } else if (val.isEmpty && index > 0) {
                                            _focusNodes[index - 1].requestFocus();
                                          }
                                          setState(() {});
                                        },
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),

                          const SizedBox(height: 20),

                          // 5. Đếm ngược & Nút gửi lại
                          Center(
                            child: Text(
                              _countdown > 0
                                  ? 'Gửi lại mã sau 00:${_countdown.toString().padLeft(2, '0')}'
                                  : 'Bạn có thể gửi lại mã ngay bây giờ',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w400,
                                color: AppColors.textSecondary, // #6B6158
                              ),
                            ),
                          ),

                          const SizedBox(height: 16),

                          // Nút "Gửi lại mã" (height: 44, r=14, background #EBE3DA)
                          SizedBox(
                            width: double.infinity,
                            height: 44,
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.surfaceDisabled, // #EBE3DA
                                foregroundColor: _countdown == 0
                                    ? AppColors.primary
                                    : AppColors.textSecondary, // #6B6158
                                elevation: 0,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                              ),
                              onPressed: _countdown == 0
                                  ? () {
                                      setState(() {
                                        _countdown = 45;
                                      });
                                      _startCountdown();
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Text('Mã OTP mới đã được gửi lại!'),
                                          duration: Duration(seconds: 2),
                                        ),
                                      );
                                    }
                                  : null,
                              child: Text(
                                'Gửi lại mã',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: _countdown == 0
                                      ? AppColors.primary
                                      : AppColors.textSecondary,
                                ),
                              ),
                            ),
                          ),

                          const SizedBox(height: 12),

                          // Nút "Thay đổi số điện thoại" (height: 44, r=14, color #985018)
                          Center(
                            child: InkWell(
                              onTap: () => Navigator.pop(context),
                              borderRadius: BorderRadius.circular(14),
                              child: Container(
                                height: 44,
                                padding: const EdgeInsets.symmetric(horizontal: 16),
                                alignment: Alignment.center,
                                child: const Text(
                                  'Thay đổi số điện thoại',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.primary, // #985018
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),

                      // --- PHẦN DƯỚI: Thông báo & Nút Xác nhận ---
                      Padding(
                        padding: const EdgeInsets.only(top: 24.0, bottom: 8.0),
                        child: Column(
                          children: [
                            // Khung thông báo (background #F3E2CE, r=12)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              decoration: BoxDecoration(
                                color: AppColors.surfaceSecondary, // #F3E2CE
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Icon(
                                    Icons.info_outline_rounded,
                                    size: 16,
                                    color: AppColors.primary, // #985018
                                  ),
                                  SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      'Mã xác thực gồm 6 chữ số được gửi qua SMS đến số điện thoại của bạn.',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w400,
                                        color: AppColors.textSecondary, // #6B6158
                                        height: 1.4,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            const SizedBox(height: 16),

                            // Nút Xác nhận (PrimaryButton 56px, r=14)
                            PrimaryButton(
                              text: 'Xác nhận',
                              isLoading: _isLoading,
                              onPressed: _handleVerify,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
