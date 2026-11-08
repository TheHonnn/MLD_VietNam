import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
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
      await ApiClient.instance.post(
        ApiEndpoints.authRegisterEmail,
        data: {
          'fullName': _nameController.text.trim(),
          'email': email,
          'password': _passwordController.text,
        },
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Mã xác thực OTP gồm 6 chữ số đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư (kể cả mục Thư rác/Spam).'),
            backgroundColor: Color(0xFF003876),
            duration: Duration(seconds: 5),
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
    const primaryNavy = Color(0xFF003876);
    const ctaGreen = Color(0xFF16A34A);
    const textDark = Color(0xFF0F172A);
    const textMuted = Color(0xFF64748B);

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 1. Nút quay lại
                Align(
                  alignment: Alignment.centerLeft,
                  child: InkWell(
                    onTap: () => Navigator.pop(context),
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.05),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.arrow_back_ios_new_rounded,
                        size: 18,
                        color: primaryNavy,
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 24),

                // 2. Tiêu đề
                Text(
                  'Đăng ký tài khoản',
                  style: GoogleFonts.beVietnamPro(
                    fontSize: 26,
                    fontWeight: FontWeight.w700,
                    color: primaryNavy,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Tạo tài khoản để trải nghiệm dịch vụ chăm sóc và đào tạo MLD.',
                  style: GoogleFonts.beVietnamPro(
                    fontSize: 13.5,
                    color: textMuted,
                    height: 1.45,
                  ),
                ),

                const SizedBox(height: 24),

                // 3. Các trường nhập liệu (Hạn chế viền, bóng mờ nhẹ, chuẩn 6-3-1)
                Text(
                  'Họ và tên',
                  style: GoogleFonts.beVietnamPro(fontSize: 13.5, fontWeight: FontWeight.w600, color: primaryNavy),
                ),
                const SizedBox(height: 8),
                _buildInputContainer(
                  child: TextFormField(
                    controller: _nameController,
                    validator: AppValidators.fullName,
                    style: GoogleFonts.beVietnamPro(fontSize: 14.5, fontWeight: FontWeight.w500, color: textDark),
                    decoration: _buildInputDecoration(
                      hint: 'Nguyễn Văn A',
                      prefixIcon: Icons.person_outline_rounded,
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                Text(
                  'Địa chỉ Email',
                  style: GoogleFonts.beVietnamPro(fontSize: 13.5, fontWeight: FontWeight.w600, color: primaryNavy),
                ),
                const SizedBox(height: 8),
                _buildInputContainer(
                  child: TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    validator: AppValidators.email,
                    style: GoogleFonts.beVietnamPro(fontSize: 14.5, fontWeight: FontWeight.w500, color: textDark),
                    decoration: _buildInputDecoration(
                      hint: 'example@email.com',
                      prefixIcon: Icons.mail_outline_rounded,
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                Text(
                  'Mật khẩu',
                  style: GoogleFonts.beVietnamPro(fontSize: 13.5, fontWeight: FontWeight.w600, color: primaryNavy),
                ),
                const SizedBox(height: 8),
                _buildInputContainer(
                  child: TextFormField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    validator: (val) {
                      if (val == null || val.length < 6) {
                        return 'Mật khẩu phải có tối thiểu 6 ký tự';
                      }
                      return null;
                    },
                    style: GoogleFonts.beVietnamPro(fontSize: 14.5, fontWeight: FontWeight.w500, color: textDark),
                    decoration: _buildInputDecoration(
                      hint: 'Tối thiểu 6 ký tự',
                      prefixIcon: Icons.lock_outline_rounded,
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                          color: textMuted,
                          size: 20,
                        ),
                        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                Text(
                  'Xác nhận mật khẩu',
                  style: GoogleFonts.beVietnamPro(fontSize: 13.5, fontWeight: FontWeight.w600, color: primaryNavy),
                ),
                const SizedBox(height: 8),
                _buildInputContainer(
                  child: TextFormField(
                    controller: _confirmPasswordController,
                    obscureText: _obscureConfirmPassword,
                    validator: (val) {
                      if (val == null || val.isEmpty) {
                        return 'Vui lòng nhập lại mật khẩu';
                      }
                      return null;
                    },
                    style: GoogleFonts.beVietnamPro(fontSize: 14.5, fontWeight: FontWeight.w500, color: textDark),
                    decoration: _buildInputDecoration(
                      hint: 'Nhập lại mật khẩu',
                      prefixIcon: Icons.lock_outline_rounded,
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscureConfirmPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                          color: textMuted,
                          size: 20,
                        ),
                        onPressed: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
                      ),
                    ),
                  ),
                ),

                if (_serverError != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline, color: Color(0xFFDC2626), size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _serverError!,
                            style: GoogleFonts.beVietnamPro(fontSize: 13, color: const Color(0xFF991B1B)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 28),

                // 4. Nút đăng ký (10% CTA Green)
                PrimaryButton(
                  text: 'Đăng ký tài khoản',
                  backgroundColor: ctaGreen,
                  isLoading: _isLoading,
                  onPressed: _handleRegister,
                ),

                const SizedBox(height: 24),

                // 5. Đã có tài khoản
                Wrap(
                  alignment: WrapAlignment.center,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      'Đã có tài khoản? ',
                      style: GoogleFonts.beVietnamPro(fontSize: 13.5, color: textMuted),
                    ),
                    InkWell(
                      onTap: () => Navigator.pop(context),
                      child: Text(
                        'Đăng nhập ngay',
                        style: GoogleFonts.beVietnamPro(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w700,
                          color: primaryNavy,
                          decoration: TextDecoration.underline,
                          decorationColor: primaryNavy,
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

  Widget _buildInputContainer({required Widget child}) {
    return Container(
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
      child: child,
    );
  }

  InputDecoration _buildInputDecoration({
    required String hint,
    required IconData prefixIcon,
    Widget? suffixIcon,
  }) {
    return InputDecoration(
      hintText: hint,
      hintStyle: GoogleFonts.beVietnamPro(fontSize: 14, color: const Color(0xFF94A3B8)),
      prefixIcon: Icon(prefixIcon, color: const Color(0xFF003876), size: 20),
      suffixIcon: suffixIcon,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
      border: InputBorder.none,
    );
  }
}
