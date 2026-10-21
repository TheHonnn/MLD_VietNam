import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../core/utils/validators.dart';
import '../../widgets/primary_button.dart';
import 'a04_otp_screen.dart';

class A03ForgotPasswordScreen extends StatefulWidget {
  const A03ForgotPasswordScreen({super.key});

  @override
  State<A03ForgotPasswordScreen> createState() => _A03ForgotPasswordScreenState();
}

class _A03ForgotPasswordScreenState extends State<A03ForgotPasswordScreen> {
  final _emailController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  bool _isLoading = false;
  bool _obscureNew = true;
  bool _obscureConfirm = true;
  String? _verifiedOtp;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleSendOtp() async {
    final emailError = AppValidators.email(_emailController.text.trim());
    if (emailError != null) {
      setState(() => _errorMessage = emailError);
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final email = _emailController.text.trim();
      await ApiClient.instance.post(
        ApiEndpoints.authForgotPassword,
        data: {'email': email},
      );

      if (mounted) {
        final otp = await Navigator.push<String>(
          context,
          MaterialPageRoute(
            builder: (_) => A04OtpScreen(
              email: email,
              purpose: 'RESET_PASSWORD',
            ),
          ),
        );

        if (otp != null && otp.length == 6) {
          setState(() {
            _verifiedOtp = otp;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceFirst('Exception: ', '');
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _handleResetPassword() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    if (_newPasswordController.text != _confirmPasswordController.text) {
      setState(() => _errorMessage = 'Mật khẩu xác nhận không khớp');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await ApiClient.instance.post(
        ApiEndpoints.authResetPassword,
        data: {
          'email': _emailController.text.trim(),
          'otp': _verifiedOtp,
          'newPassword': _newPasswordController.text,
        },
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đặt lại mật khẩu thành công! Vui lòng đăng nhập.'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceFirst('Exception: ', '');
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background, // #F8F1E8
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Back button
              Align(
                alignment: Alignment.centerLeft,
                child: InkWell(
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
                    child: const Icon(
                      Icons.arrow_back_rounded,
                      size: 20,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 24),

              Text(
                _verifiedOtp == null ? 'Khôi phục mật khẩu' : 'Thiết lập mật khẩu mới',
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textHeading,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _verifiedOtp == null
                    ? 'Nhập địa chỉ email của bạn để nhận mã xác thực OTP khôi phục mật khẩu.'
                    : 'Nhập mật khẩu mới cho tài khoản email ${_emailController.text.trim()}.',
                style: const TextStyle(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                ),
              ),

              const SizedBox(height: 28),

              if (_verifiedOtp == null) ...[
                // Bước 1: Nhập Email
                const Text(
                  'Địa chỉ Email',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: InputDecoration(
                    hintText: 'example@email.com',
                    prefixIcon: const Icon(Icons.mail_outline_rounded, color: AppColors.textSecondary, size: 20),
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.primary, width: 1.5)),
                  ),
                ),

                const SizedBox(height: 28),

                PrimaryButton(
                  text: 'Gửi mã xác thực',
                  isLoading: _isLoading,
                  onPressed: _handleSendOtp,
                ),
              ] else ...[
                // Bước 2: Nhập Mật khẩu mới
                Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'Mật khẩu mới',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _newPasswordController,
                        obscureText: _obscureNew,
                        validator: (val) {
                          if (val == null || val.length < 6) {
                            return 'Mật khẩu phải có tối thiểu 6 ký tự';
                          }
                          return null;
                        },
                        decoration: InputDecoration(
                          hintText: 'Tối thiểu 6 ký tự',
                          prefixIcon: const Icon(Icons.lock_outline_rounded, color: AppColors.textSecondary, size: 20),
                          suffixIcon: IconButton(
                            icon: Icon(_obscureNew ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                            onPressed: () => setState(() => _obscureNew = !_obscureNew),
                          ),
                          filled: true,
                          fillColor: Colors.white,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
                        ),
                      ),

                      const SizedBox(height: 16),

                      const Text(
                        'Xác nhận mật khẩu mới',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _confirmPasswordController,
                        obscureText: _obscureConfirm,
                        validator: (val) {
                          if (val == null || val.isEmpty) {
                            return 'Vui lòng xác nhận mật khẩu';
                          }
                          return null;
                        },
                        decoration: InputDecoration(
                          hintText: 'Nhập lại mật khẩu mới',
                          prefixIcon: const Icon(Icons.lock_outline_rounded, color: AppColors.textSecondary, size: 20),
                          suffixIcon: IconButton(
                            icon: Icon(_obscureConfirm ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                            onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                          ),
                          filled: true,
                          fillColor: Colors.white,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.border)),
                        ),
                      ),

                      const SizedBox(height: 28),

                      PrimaryButton(
                        text: 'Cập nhật mật khẩu',
                        isLoading: _isLoading,
                        onPressed: _handleResetPassword,
                      ),
                    ],
                  ),
                ),
              ],

              if (_errorMessage != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Text(
                    _errorMessage!,
                    style: TextStyle(fontSize: 13, color: Colors.red.shade800),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

