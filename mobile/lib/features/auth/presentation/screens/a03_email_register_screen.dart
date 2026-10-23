import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../core/utils/validators.dart';
import '../../widgets/primary_button.dart';
import 'a04_otp_screen.dart';

class A03EmailRegisterScreen extends StatefulWidget {
  const A03EmailRegisterScreen({super.key});

  @override
  State<A03EmailRegisterScreen> createState() => _A03EmailRegisterScreenState();
}

class _A03EmailRegisterScreenState extends State<A03EmailRegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _isLoading = false;
  String? _serverError;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleRegister() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    if (_passwordController.text != _confirmPasswordController.text) {
      setState(() {
        _serverError = 'Mật khẩu xác nhận không khớp';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _serverError = null;
    });

    try {
      final email = _emailController.text.trim();
      final res = await ApiClient.instance.post(
        ApiEndpoints.authRegisterEmail,
        data: {
          'fullName': _nameController.text.trim(),
          'email': email,
          'password': _passwordController.text,
        },
      );

      if (mounted) {
        final body = res.data;
        final message = (body is Map && body['message'] is String)
            ? body['message'] as String
            : ((body is Map && body['data'] is Map && body['data']['message'] is String)
                ? body['data']['message'] as String
                : 'Mã xác thực OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message),
            backgroundColor: AppColors.primary,
            duration: const Duration(seconds: 5),
          ),
        );

        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => A04OtpScreen(
              email: email,
              purpose: 'REGISTER_EMAIL',
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _serverError = e.toString().replaceFirst('Exception: ', '');
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
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 1. Back button
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

                // 2. Title & Subtitle
                const Text(
                  'Đăng ký tài khoản',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textHeading,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Tạo tài khoản bằng email để trải nghiệm dịch vụ chăm sóc sắc đẹp & y tế MLD.',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppColors.textSecondary,
                  ),
                ),

                const SizedBox(height: 28),

                // 3. Form fields
                const Text(
                  'Họ và tên',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _nameController,
                  validator: AppValidators.fullName,
                  decoration: _buildInputDecoration(hint: 'Nguyễn Văn A', prefixIcon: Icons.person_outline_rounded),
                ),

                const SizedBox(height: 16),

                const Text(
                  'Địa chỉ Email',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  validator: AppValidators.email,
                  decoration: _buildInputDecoration(hint: 'example@email.com', prefixIcon: Icons.mail_outline_rounded),
                ),

                const SizedBox(height: 16),

                const Text(
                  'Mật khẩu',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  validator: (val) {
                    if (val == null || val.length < 6) {
                      return 'Mật khẩu phải có tối thiểu 6 ký tự';
                    }
                    return null;
                  },
                  decoration: _buildInputDecoration(
                    hint: 'Tối thiểu 6 ký tự',
                    prefixIcon: Icons.lock_outline_rounded,
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                        color: AppColors.textSecondary,
                      ),
                      onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                const Text(
                  'Xác nhận mật khẩu',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 6),
                TextFormField(
                  controller: _confirmPasswordController,
                  obscureText: _obscureConfirmPassword,
                  validator: (val) {
                    if (val == null || val.isEmpty) {
                      return 'Vui lòng nhập lại mật khẩu';
                    }
                    return null;
                  },
                  decoration: _buildInputDecoration(
                    hint: 'Nhập lại mật khẩu',
                    prefixIcon: Icons.lock_outline_rounded,
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscureConfirmPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                        color: AppColors.textSecondary,
                      ),
                      onPressed: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
                    ),
                  ),
                ),

                if (_serverError != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.red.shade200),
                    ),
                    child: Text(
                      _serverError!,
                      style: TextStyle(fontSize: 13, color: Colors.red.shade800),
                    ),
                  ),
                ],

                const SizedBox(height: 32),

                // 4. Submit button
                PrimaryButton(
                  text: 'Đăng ký tài khoản',
                  isLoading: _isLoading,
                  onPressed: _handleRegister,
                ),

                const SizedBox(height: 24),

                // 5. Already have account
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      'Đã có tài khoản? ',
                      style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
                    ),
                    InkWell(
                      onTap: () => Navigator.pop(context),
                      child: const Text(
                        'Đăng nhập ngay',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  InputDecoration _buildInputDecoration({
    required String hint,
    required IconData prefixIcon,
    Widget? suffixIcon,
  }) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(fontSize: 14, color: AppColors.textPlaceholder),
      prefixIcon: Icon(prefixIcon, color: AppColors.textSecondary, size: 20),
      suffixIcon: suffixIcon,
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
      ),
    );
  }
}

