import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import '../../../../core/utils/validators.dart';
import '../../widgets/primary_button.dart';
import 'a04_otp_screen.dart';

class A03EmailRegisterScreen extends StatefulWidget {
  final int initialTabIndex;

  const A03EmailRegisterScreen({
    super.key,
    this.initialTabIndex = 0,
  });

  @override
  State<A03EmailRegisterScreen> createState() => _A03EmailRegisterScreenState();
}

class _A03EmailRegisterScreenState extends State<A03EmailRegisterScreen> {
  int _selectedTabIndex = 0;

  final _emailFormKey = GlobalKey<FormState>();
  final _phoneFormKey = GlobalKey<FormState>();

  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  final _phoneNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _phonePasswordController = TextEditingController();
  final _phoneConfirmPasswordController = TextEditingController();

  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _obscurePhonePassword = true;
  bool _obscurePhoneConfirmPassword = true;
  bool _isLoading = false;
  String? _serverError;

  @override
  void initState() {
    super.initState();
    _selectedTabIndex = widget.initialTabIndex;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();

    _phoneNameController.dispose();
    _phoneController.dispose();
    _phonePasswordController.dispose();
    _phoneConfirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleRegisterEmail() async {
    if (!(_emailFormKey.currentState?.validate() ?? false)) return;

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

  Future<void> _handleRegisterPhone() async {
    if (!(_phoneFormKey.currentState?.validate() ?? false)) return;

    if (_phonePasswordController.text != _phoneConfirmPasswordController.text) {
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
      final raw = _phoneController.text.trim().replaceAll(' ', '');
      final phone = raw.startsWith('0') ? raw : '0$raw';

      await ApiClient.instance.post(
        ApiEndpoints.authRegisterPhone,
        data: {
          'fullName': _phoneNameController.text.trim(),
          'phone': phone,
          'password': _phonePasswordController.text,
        },
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Mã xác thực OTP đã được gửi qua tin nhắn SMS tới số điện thoại của bạn.'),
            backgroundColor: Color(0xFF003876),
            duration: Duration(seconds: 5),
          ),
        );

        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => A04OtpScreen(
              phoneNumber: phone,
              purpose: 'REGISTER_PHONE',
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
                'Đăng ký tài khoản',
                style: GoogleFonts.beVietnamPro(
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                  color: primaryNavy,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                _selectedTabIndex == 0
                    ? 'Tạo tài khoản qua Email để trải nghiệm dịch vụ chăm sóc và đào tạo MLD.'
                    : 'Tạo tài khoản qua Số điện thoại để trải nghiệm dịch vụ chăm sóc và đào tạo MLD.',
                style: GoogleFonts.beVietnamPro(
                  fontSize: 13.5,
                  color: textMuted,
                  height: 1.45,
                ),
              ),

              const SizedBox(height: 20),

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
                            _serverError = null;
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
                                    )
                                  ]
                                : null,
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            'Email & Mật khẩu',
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
                            _serverError = null;
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
                                    )
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

              const SizedBox(height: 24),

              if (_selectedTabIndex == 0)
                Form(
                  key: _emailFormKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Họ và tên',
                        style: GoogleFonts.beVietnamPro(fontSize: 13.5, fontWeight: FontWeight.w600, color: primaryNavy),
                      ),
                      const SizedBox(height: 8),
                      _buildInputContainer(
                        child: TextFormField(
                          controller: _nameController,
                          textCapitalization: TextCapitalization.words,
                          validator: (v) => (v == null || v.trim().isEmpty) ? 'Vui lòng nhập họ và tên' : null,
                          style: GoogleFonts.beVietnamPro(fontSize: 14.5, fontWeight: FontWeight.w500, color: textDark),
                          decoration: InputDecoration(
                            hintText: 'Nguyễn Văn A',
                            hintStyle: GoogleFonts.beVietnamPro(fontSize: 14, color: const Color(0xFF94A3B8)),
                            prefixIcon: const Icon(Icons.person_outline_rounded, color: primaryNavy, size: 20),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
                            border: InputBorder.none,
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
                          decoration: InputDecoration(
                            hintText: 'example@email.com',
                            hintStyle: GoogleFonts.beVietnamPro(fontSize: 14, color: const Color(0xFF94A3B8)),
                            prefixIcon: const Icon(Icons.mail_outline_rounded, color: primaryNavy, size: 20),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
                            border: InputBorder.none,
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
                          validator: (v) {
                            if (v == null || v.isEmpty) return 'Vui lòng nhập mật khẩu';
                            if (v.length < 6) return 'Mật khẩu tối thiểu 6 ký tự';
                            return null;
                          },
                          style: GoogleFonts.beVietnamPro(fontSize: 14.5, fontWeight: FontWeight.w500, color: textDark),
                          decoration: InputDecoration(
                            hintText: 'Tối thiểu 6 ký tự',
                            hintStyle: GoogleFonts.beVietnamPro(fontSize: 14, color: const Color(0xFF94A3B8)),
                            prefixIcon: const Icon(Icons.lock_outline_rounded, color: primaryNavy, size: 20),
                            suffixIcon: IconButton(
                              icon: Icon(_obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: textMuted, size: 20),
                              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                            ),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
                            border: InputBorder.none,
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
                          validator: (v) {
                            if (v == null || v.isEmpty) return 'Vui lòng xác nhận mật khẩu';
                            return null;
                          },
                          style: GoogleFonts.beVietnamPro(fontSize: 14.5, fontWeight: FontWeight.w500, color: textDark),
                          decoration: InputDecoration(
                            hintText: 'Nhập lại mật khẩu',
                            hintStyle: GoogleFonts.beVietnamPro(fontSize: 14, color: const Color(0xFF94A3B8)),
                            prefixIcon: const Icon(Icons.lock_outline_rounded, color: primaryNavy, size: 20),
                            suffixIcon: IconButton(
                              icon: Icon(_obscureConfirmPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: textMuted, size: 20),
                              onPressed: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
                            ),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
                            border: InputBorder.none,
                          ),
                        ),
                      ),

                      const SizedBox(height: 28),

                      PrimaryButton(
                        text: 'Đăng ký',
                        backgroundColor: ctaGreen,
                        isLoading: _isLoading,
                        onPressed: _handleRegisterEmail,
                      ),
                    ],
                  ),
                )
              else
                Form(
                  key: _phoneFormKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Họ và tên',
                        style: GoogleFonts.beVietnamPro(fontSize: 13.5, fontWeight: FontWeight.w600, color: primaryNavy),
                      ),
                      const SizedBox(height: 8),
                      _buildInputContainer(
                        child: TextFormField(
                          controller: _phoneNameController,
                          textCapitalization: TextCapitalization.words,
                          validator: (v) => (v == null || v.trim().isEmpty) ? 'Vui lòng nhập họ và tên' : null,
                          style: GoogleFonts.beVietnamPro(fontSize: 14.5, fontWeight: FontWeight.w500, color: textDark),
                          decoration: InputDecoration(
                            hintText: 'Nguyễn Văn A',
                            hintStyle: GoogleFonts.beVietnamPro(fontSize: 14, color: const Color(0xFF94A3B8)),
                            prefixIcon: const Icon(Icons.person_outline_rounded, color: primaryNavy, size: 20),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
                            border: InputBorder.none,
                          ),
                        ),
                      ),

                      const SizedBox(height: 16),

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
                                validator: (v) {
                                  if (v == null || v.trim().isEmpty) return 'Vui lòng nhập số điện thoại';
                                  final digits = v.replaceAll(RegExp(r'\D'), '');
                                  if (digits.length < 9) return 'Số điện thoại không hợp lệ';
                                  return null;
                                },
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

                      const SizedBox(height: 16),

                      Text(
                        'Mật khẩu',
                        style: GoogleFonts.beVietnamPro(fontSize: 13.5, fontWeight: FontWeight.w600, color: primaryNavy),
                      ),
                      const SizedBox(height: 8),
                      _buildInputContainer(
                        child: TextFormField(
                          controller: _phonePasswordController,
                          obscureText: _obscurePhonePassword,
                          validator: (v) {
                            if (v == null || v.isEmpty) return 'Vui lòng nhập mật khẩu';
                            if (v.length < 6) return 'Mật khẩu tối thiểu 6 ký tự';
                            return null;
                          },
                          style: GoogleFonts.beVietnamPro(fontSize: 14.5, fontWeight: FontWeight.w500, color: textDark),
                          decoration: InputDecoration(
                            hintText: 'Tối thiểu 6 ký tự',
                            hintStyle: GoogleFonts.beVietnamPro(fontSize: 14, color: const Color(0xFF94A3B8)),
                            prefixIcon: const Icon(Icons.lock_outline_rounded, color: primaryNavy, size: 20),
                            suffixIcon: IconButton(
                              icon: Icon(_obscurePhonePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: textMuted, size: 20),
                              onPressed: () => setState(() => _obscurePhonePassword = !_obscurePhonePassword),
                            ),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
                            border: InputBorder.none,
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
                          controller: _phoneConfirmPasswordController,
                          obscureText: _obscurePhoneConfirmPassword,
                          validator: (v) {
                            if (v == null || v.isEmpty) return 'Vui lòng xác nhận mật khẩu';
                            return null;
                          },
                          style: GoogleFonts.beVietnamPro(fontSize: 14.5, fontWeight: FontWeight.w500, color: textDark),
                          decoration: InputDecoration(
                            hintText: 'Nhập lại mật khẩu',
                            hintStyle: GoogleFonts.beVietnamPro(fontSize: 14, color: const Color(0xFF94A3B8)),
                            prefixIcon: const Icon(Icons.lock_outline_rounded, color: primaryNavy, size: 20),
                            suffixIcon: IconButton(
                              icon: Icon(_obscurePhoneConfirmPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: textMuted, size: 20),
                              onPressed: () => setState(() => _obscurePhoneConfirmPassword = !_obscurePhoneConfirmPassword),
                            ),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
                            border: InputBorder.none,
                          ),
                        ),
                      ),

                      const SizedBox(height: 28),

                      PrimaryButton(
                        text: 'Đăng ký',
                        backgroundColor: ctaGreen,
                        isLoading: _isLoading,
                        onPressed: _handleRegisterPhone,
                      ),
                    ],
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

              const SizedBox(height: 24),

              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Đã có tài khoản? ',
                    style: GoogleFonts.beVietnamPro(fontSize: 14, color: textMuted),
                  ),
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Text(
                      'Đăng nhập ngay',
                      style: GoogleFonts.beVietnamPro(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: primaryNavy,
                      ),
                    ),
                  ),
                ],
              ),
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
