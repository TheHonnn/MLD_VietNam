import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/utils/validators.dart';
import '../../widgets/primary_button.dart';
import 'a04_otp_screen.dart';

class A03ForgotPasswordScreen extends StatefulWidget {
  final int initialTabIndex;

  const A03ForgotPasswordScreen({
    super.key,
    this.initialTabIndex = 0,
  });

  @override
  State<A03ForgotPasswordScreen> createState() => _A03ForgotPasswordScreenState();
}

class _A03ForgotPasswordScreenState extends State<A03ForgotPasswordScreen> {
  int _selectedTabIndex = 0;

  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  bool _isLoading = false;
  bool _obscureNew = true;
  bool _obscureConfirm = true;
  String? _verifiedOtp;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _selectedTabIndex = widget.initialTabIndex;
    final lastEmail = AuthService.instance.lastLoginEmail;
    if (lastEmail != null && lastEmail.isNotEmpty) {
      _emailController.text = lastEmail;
    }
    final lastPhone = AuthService.instance.lastLoginPhone;
    if (lastPhone != null && lastPhone.isNotEmpty) {
      final clean = lastPhone.startsWith('0') ? lastPhone.substring(1) : lastPhone;
      _phoneController.text = clean;
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _phoneController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleSendOtp() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      if (_selectedTabIndex == 0) {
        final emailError = AppValidators.email(_emailController.text.trim());
        if (emailError != null) {
          setState(() {
            _errorMessage = emailError;
            _isLoading = false;
          });
          return;
        }

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

          if (otp != null && otp.isNotEmpty) {
            setState(() {
              _verifiedOtp = otp;
            });
          }
        }
      } else {
        final raw = _phoneController.text.trim().replaceAll(' ', '');
        if (raw.isEmpty) {
          setState(() {
            _errorMessage = 'Vui lòng nhập số điện thoại';
            _isLoading = false;
          });
          return;
        }
        final phone = raw.startsWith('0') ? raw : '0$raw';
        if (phone.length < 10) {
          setState(() {
            _errorMessage = 'Số điện thoại không hợp lệ';
            _isLoading = false;
          });
          return;
        }

        await ApiClient.instance.post(
          ApiEndpoints.authForgotPassword,
          data: {'phone': phone},
        );

        if (mounted) {
          final otp = await Navigator.push<String>(
            context,
            MaterialPageRoute(
              builder: (_) => A04OtpScreen(
                phoneNumber: phone,
                purpose: 'RESET_PASSWORD',
              ),
            ),
          );

          if (otp != null && otp.isNotEmpty) {
            setState(() {
              _verifiedOtp = otp;
            });
          }
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
      setState(() {
        _errorMessage = 'Mật khẩu xác nhận không khớp.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final Map<String, dynamic> payload = {
        'otp': _verifiedOtp,
        'newPassword': _newPasswordController.text,
      };

      if (_selectedTabIndex == 0) {
        payload['email'] = _emailController.text.trim();
      } else {
        final raw = _phoneController.text.trim().replaceAll(' ', '');
        payload['phone'] = raw.startsWith('0') ? raw : '0$raw';
      }

      await ApiClient.instance.post(
        ApiEndpoints.authResetPassword,
        data: payload,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đặt lại mật khẩu thành công! Vui lòng đăng nhập.'),
            backgroundColor: Color(0xFF16A34A),
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
    const primaryNavy = Color(0xFF003876);
    const ctaGreen = Color(0xFF16A34A);
    const textDark = Color(0xFF0F172A);
    const textMuted = Color(0xFF64748B);

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
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

              Text(
                _verifiedOtp == null ? 'Khôi phục mật khẩu' : 'Thiết lập mật khẩu mới',
                style: GoogleFonts.beVietnamPro(
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                  color: primaryNavy,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                _verifiedOtp == null
                    ? (_selectedTabIndex == 0
                        ? 'Nhập địa chỉ email của bạn để nhận mã xác thực OTP khôi phục mật khẩu.'
                        : 'Nhập số điện thoại của bạn để nhận mã xác thực OTP qua SMS.')
                    : (_selectedTabIndex == 0
                        ? 'Nhập mật khẩu mới cho tài khoản email ${_emailController.text.trim()}.'
                        : 'Nhập mật khẩu mới cho tài khoản số điện thoại ${_phoneController.text.trim()}.'),
                style: GoogleFonts.beVietnamPro(
                  fontSize: 13.5,
                  color: textMuted,
                  height: 1.45,
                ),
              ),

              const SizedBox(height: 20),

              if (_verifiedOtp == null) ...[
                Container(
                  height: 48,
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () {
                            setState(() {
                              _selectedTabIndex = 0;
                              _errorMessage = null;
                            });
                          },
                          child: Container(
                            decoration: BoxDecoration(
                              color: _selectedTabIndex == 0 ? Colors.white : Colors.transparent,
                              borderRadius: BorderRadius.circular(10),
                              boxShadow: _selectedTabIndex == 0
                                  ? [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.05),
                                        blurRadius: 4,
                                        offset: const Offset(0, 1),
                                      ),
                                    ]
                                  : null,
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              'Email',
                              style: GoogleFonts.beVietnamPro(
                                fontSize: 14,
                                fontWeight: _selectedTabIndex == 0 ? FontWeight.w700 : FontWeight.w500,
                                color: _selectedTabIndex == 0 ? primaryNavy : textMuted,
                              ),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: () {
                            setState(() {
                              _selectedTabIndex = 1;
                              _errorMessage = null;
                            });
                          },
                          child: Container(
                            decoration: BoxDecoration(
                              color: _selectedTabIndex == 1 ? Colors.white : Colors.transparent,
                              borderRadius: BorderRadius.circular(10),
                              boxShadow: _selectedTabIndex == 1
                                  ? [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.05),
                                        blurRadius: 4,
                                        offset: const Offset(0, 1),
                                      ),
                                    ]
                                  : null,
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              'Số điện thoại',
                              style: GoogleFonts.beVietnamPro(
                                fontSize: 14,
                                fontWeight: _selectedTabIndex == 1 ? FontWeight.w700 : FontWeight.w500,
                                color: _selectedTabIndex == 1 ? primaryNavy : textMuted,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                if (_selectedTabIndex == 0) ...[
                  Text(
                    'Địa chỉ Email',
                    style: GoogleFonts.beVietnamPro(fontSize: 13.5, fontWeight: FontWeight.w600, color: primaryNavy),
                  ),
                  const SizedBox(height: 8),
                  _buildInputContainer(
                    child: TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      style: GoogleFonts.beVietnamPro(fontSize: 14.5, fontWeight: FontWeight.w500, color: textDark),
                      decoration: InputDecoration(
                        hintText: 'example@email.com',
                        hintStyle: GoogleFonts.beVietnamPro(fontSize: 14, color: const Color(0xFF94A3B8)),
                        prefixIcon: const Icon(Icons.mail_outline_rounded, color: primaryNavy, size: 20),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
                        border: InputBorder.none,
                      ),
                    ),
                  ),
                ] else ...[
                  Text(
                    'Số điện thoại',
                    style: GoogleFonts.beVietnamPro(fontSize: 13.5, fontWeight: FontWeight.w600, color: primaryNavy),
                  ),
                  const SizedBox(height: 8),
                  _buildInputContainer(
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 15),
                          decoration: const BoxDecoration(
                            border: Border(
                              right: BorderSide(color: Color(0xFFE2E8F0), width: 1),
                            ),
                          ),
                          child: Text(
                            '+84',
                            style: GoogleFonts.beVietnamPro(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: primaryNavy,
                            ),
                          ),
                        ),
                        Expanded(
                          child: TextFormField(
                            controller: _phoneController,
                            keyboardType: TextInputType.phone,
                            style: GoogleFonts.beVietnamPro(fontSize: 14.5, fontWeight: FontWeight.w500, color: textDark),
                            decoration: InputDecoration(
                              hintText: '912 345 678',
                              hintStyle: GoogleFonts.beVietnamPro(fontSize: 14, color: const Color(0xFF94A3B8)),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
                              border: InputBorder.none,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 28),

                PrimaryButton(
                  text: 'Gửi mã xác thực',
                  backgroundColor: ctaGreen,
                  isLoading: _isLoading,
                  onPressed: _handleSendOtp,
                ),
              ] else ...[
                Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Mật khẩu mới',
                        style: GoogleFonts.beVietnamPro(fontSize: 13.5, fontWeight: FontWeight.w600, color: primaryNavy),
                      ),
                      const SizedBox(height: 8),
                      _buildInputContainer(
                        child: TextFormField(
                          controller: _newPasswordController,
                          obscureText: _obscureNew,
                          validator: (val) {
                            if (val == null || val.length < 6) {
                              return 'Mật khẩu phải có tối thiểu 6 ký tự';
                            }
                            return null;
                          },
                          style: GoogleFonts.beVietnamPro(fontSize: 14.5, fontWeight: FontWeight.w500, color: textDark),
                          decoration: InputDecoration(
                            hintText: 'Tối thiểu 6 ký tự',
                            hintStyle: GoogleFonts.beVietnamPro(fontSize: 14, color: const Color(0xFF94A3B8)),
                            prefixIcon: const Icon(Icons.lock_outline_rounded, color: primaryNavy, size: 20),
                            suffixIcon: IconButton(
                              icon: Icon(_obscureNew ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: textMuted, size: 20),
                              onPressed: () => setState(() => _obscureNew = !_obscureNew),
                            ),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
                            border: InputBorder.none,
                          ),
                        ),
                      ),

                      const SizedBox(height: 16),

                      Text(
                        'Xác nhận mật khẩu mới',
                        style: GoogleFonts.beVietnamPro(fontSize: 13.5, fontWeight: FontWeight.w600, color: primaryNavy),
                      ),
                      const SizedBox(height: 8),
                      _buildInputContainer(
                        child: TextFormField(
                          controller: _confirmPasswordController,
                          obscureText: _obscureConfirm,
                          validator: (val) {
                            if (val == null || val.isEmpty) {
                              return 'Vui lòng xác nhận mật khẩu';
                            }
                            return null;
                          },
                          style: GoogleFonts.beVietnamPro(fontSize: 14.5, fontWeight: FontWeight.w500, color: textDark),
                          decoration: InputDecoration(
                            hintText: 'Nhập lại mật khẩu mới',
                            hintStyle: GoogleFonts.beVietnamPro(fontSize: 14, color: const Color(0xFF94A3B8)),
                            prefixIcon: const Icon(Icons.lock_outline_rounded, color: primaryNavy, size: 20),
                            suffixIcon: IconButton(
                              icon: Icon(_obscureConfirm ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: textMuted, size: 20),
                              onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                            ),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
                            border: InputBorder.none,
                          ),
                        ),
                      ),

                      const SizedBox(height: 28),

                      PrimaryButton(
                        text: 'Cập nhật mật khẩu',
                        backgroundColor: ctaGreen,
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
                          _errorMessage!,
                          style: GoogleFonts.beVietnamPro(fontSize: 13, color: const Color(0xFF991B1B)),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
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
}
